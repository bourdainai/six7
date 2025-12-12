import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdmin, handleCORS, createErrorResponse } from '../_shared/admin-middleware.ts';
import { validateImageUrl, fixTcgdexImageUrl, resolveCardImage } from '../_shared/image-resolver.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RepairStats {
  total: number;
  fixed: number;
  stillBroken: number;
  alreadyValid: number;
  errors: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCORS();
  }

  try {
    const adminUser = await requireAdmin(req);
    console.log(`🔐 Admin access granted for user: ${adminUser.email || adminUser.id}`);
  } catch (error) {
    console.error('❌ Admin authentication failed:', error);
    return createErrorResponse(error as Error);
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      mode = 'fix_urls',  // 'fix_urls' | 'validate_all' | 'resolve_missing'
      setCode = null,
      syncSource = null,
      batchSize = 100,
      dryRun = false,
      limit = 1000,
    } = await req.json().catch(() => ({}));

    console.log(`\n🔧 Starting image repair`);
    console.log(`   Mode: ${mode}`);
    console.log(`   Dry run: ${dryRun}`);
    console.log(`   Set filter: ${setCode || 'all'}`);
    console.log(`   Source filter: ${syncSource || 'all'}`);

    const stats: RepairStats = {
      total: 0,
      fixed: 0,
      stillBroken: 0,
      alreadyValid: 0,
      errors: [],
    };

    // Build query based on mode
    let query = supabase
      .from('pokemon_card_attributes')
      .select('id, card_id, images, set_code, number, sync_source, image_validated');

    if (setCode) {
      query = query.eq('set_code', setCode);
    }

    if (syncSource) {
      query = query.eq('sync_source', syncSource);
    }

    if (mode === 'fix_urls') {
      // Focus on tcgdex cards with broken URLs
      query = query.eq('sync_source', 'tcgdex');
    } else if (mode === 'validate_all') {
      // All cards that haven't been validated or failed validation
      query = query.or('image_validated.is.null,image_validated.eq.false');
    } else if (mode === 'resolve_missing') {
      // Cards with validation errors
      query = query.eq('image_validated', false);
    }

    query = query.limit(limit);

    const { data: cards, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch cards: ${fetchError.message}`);
    }

    if (!cards || cards.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No cards found matching criteria',
          stats,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    stats.total = cards.length;
    console.log(`📊 Found ${cards.length} cards to process`);

    // Process in batches
    for (let i = 0; i < cards.length; i += batchSize) {
      const batch = cards.slice(i, i + batchSize);
      console.log(`   Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(cards.length / batchSize)}`);

      for (const card of batch) {
        try {
          const images = typeof card.images === 'string' 
            ? JSON.parse(card.images) 
            : card.images || {};

          let currentLargeUrl = images.large || images.small || null;
          let needsUpdate = false;
          let newImages = { ...images };

          if (mode === 'fix_urls' && card.sync_source === 'tcgdex') {
            // Fix TCGdex URLs missing extensions
            if (currentLargeUrl && !currentLargeUrl.endsWith('.webp') && !currentLargeUrl.endsWith('.png')) {
              const fixed = fixTcgdexImageUrl(currentLargeUrl);
              if (fixed) {
                newImages = {
                  ...images,
                  small: fixed.small,
                  large: fixed.large,
                  tcgdex: fixed.large,
                };
                needsUpdate = true;
                console.log(`      Fixed URL for ${card.card_id}`);
              }
            }
          }

          if (mode === 'validate_all' || mode === 'resolve_missing') {
            // Validate the current URL
            const urlToValidate = newImages.large || newImages.small;
            
            if (urlToValidate) {
              const isValid = await validateImageUrl(urlToValidate);
              
              if (isValid) {
                stats.alreadyValid++;
                if (!dryRun) {
                  await supabase
                    .from('pokemon_card_attributes')
                    .update({
                      images: newImages,
                      image_validated: true,
                      image_validation_error: null,
                      image_validated_at: new Date().toISOString(),
                    })
                    .eq('id', card.id);
                }
              } else {
                // Try to resolve from alternate sources
                const resolved = await resolveCardImage({
                  set_code: card.set_code,
                  number: card.number,
                  card_id: card.card_id,
                  sync_source: card.sync_source,
                });

                if (resolved) {
                  newImages = {
                    ...newImages,
                    small: resolved.small,
                    large: resolved.large,
                    resolved_source: resolved.source,
                  };
                  needsUpdate = true;
                  stats.fixed++;
                  console.log(`      Resolved ${card.card_id} from ${resolved.source}`);
                } else {
                  stats.stillBroken++;
                }
              }
            } else {
              stats.stillBroken++;
            }
          }

          if (needsUpdate && !dryRun) {
            const { error: updateError } = await supabase
              .from('pokemon_card_attributes')
              .update({
                images: newImages,
                image_validated: null, // Reset for re-validation
                image_validation_error: null,
              })
              .eq('id', card.id);

            if (updateError) {
              stats.errors.push(`${card.card_id}: ${updateError.message}`);
            } else if (mode === 'fix_urls') {
              stats.fixed++;
            }
          }

        } catch (cardError: any) {
          stats.errors.push(`${card.card_id}: ${cardError.message}`);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    console.log(`\n✅ Repair completed`);
    console.log(`📊 Stats: ${stats.fixed} fixed, ${stats.alreadyValid} valid, ${stats.stillBroken} broken`);

    return new Response(
      JSON.stringify({
        success: true,
        dryRun,
        mode,
        stats,
        message: dryRun 
          ? `Would process ${stats.total} cards`
          : `Processed ${stats.total} cards: ${stats.fixed} fixed, ${stats.alreadyValid} valid, ${stats.stillBroken} still broken`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
