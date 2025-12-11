import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdmin, handleCORS, createErrorResponse } from '../_shared/admin-middleware.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TCGDEX_ASSETS_BASE = 'https://assets.tcgdex.net';

/**
 * Validate if an image URL is accessible
 */
async function validateImageUrl(url: string, timeoutMs = 5000): Promise<{ valid: boolean; error?: string }> {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'Invalid URL' };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': '6Seven-ImageFetcher/1.0',
      },
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.startsWith('image/')) {
        return { valid: true };
      } else {
        return { valid: false, error: `Not an image (content-type: ${contentType})` };
      }
    } else if (response.status === 404) {
      return { valid: false, error: 'Image not found (404)' };
    } else {
      return { valid: false, error: `HTTP ${response.status}` };
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return { valid: false, error: 'Request timeout' };
    }
    return { valid: false, error: error.message || 'Network error' };
  }
}

/**
 * Extract set code and local ID from card_id or use set_code/number
 */
function getImageUrl(card: any): string | null {
  // Try to parse from card_id - support multiple formats:
  // tcgdex_ja_SV6-068, tcgdex_github_ja_setcode-localid, tcgcollector_sv4a_162
  
  // TCGdex Japanese format: tcgdex_ja_SETCODE-NUMBER or tcgdex_github_ja_SETCODE-NUMBER
  const tcgdexMatch = card.card_id?.match(/tcgdex(?:_github)?_ja_([A-Za-z0-9]+)[-_](.+)/i);
  if (tcgdexMatch) {
    const setCode = tcgdexMatch[1];
    const localId = tcgdexMatch[2];
    return `${TCGDEX_ASSETS_BASE}/ja/${setCode}/${localId}`;
  }

  // TCGCollector format: tcgcollector_SETCODE_NUMBER (these are likely English/international)
  const collectorMatch = card.card_id?.match(/tcgcollector_([A-Za-z0-9]+)_(.+)/i);
  if (collectorMatch) {
    const setCode = collectorMatch[1].toLowerCase();
    const localId = collectorMatch[2];
    // TCGdex also has English assets
    return `${TCGDEX_ASSETS_BASE}/en/${setCode}/${localId}`;
  }

  // Fallback to set_code and number (try Japanese first, then English)
  if (card.set_code && card.number) {
    // Check if it looks like a Japanese card
    const isJapanese = card.card_id?.includes('_ja_') || card.name?.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/);
    const lang = isJapanese ? 'ja' : 'en';
    return `${TCGDEX_ASSETS_BASE}/${lang}/${card.set_code}/${card.number}`;
  }

  return null;
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
      dryRun = false, 
      batchSize = 50,
      limit = null 
    } = await req.json().catch(() => ({}));

    console.log(`🖼️ Fetching missing images (dryRun: ${dryRun}, batchSize: ${batchSize})`);

    // Fetch cards without images or with invalid images
    let query = supabase
      .from('pokemon_card_attributes')
      .select('id, card_id, set_code, number, name, images, image_validated')
      .or('images.is.null,image_validated.eq.false')
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    } else {
      query = query.limit(batchSize);
    }

    const { data: cards, error } = await query;

    if (error) throw error;

    if (!cards || cards.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No cards need images',
          stats: { processed: 0, updated: 0, failed: 0 },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 Found ${cards.length} cards to process`);

    let updated = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      
      // Get image URL from TCGdx assets
      const imageUrl = getImageUrl(card);
      
      if (!imageUrl) {
        failed++;
        errors.push(`${card.card_id}: Could not construct image URL`);
        continue;
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));

      try {
        // Validate image exists
        const validation = await validateImageUrl(imageUrl);

        if (validation.valid) {
          // Image exists - update card
          const images = {
            small: imageUrl,
            large: imageUrl,
            tcgdex: imageUrl
          };

          if (!dryRun) {
            const { error: updateError } = await supabase
              .from('pokemon_card_attributes')
              .update({ 
                images,
                image_validated: true,
                image_validation_error: null,
                image_validated_at: new Date().toISOString()
              })
              .eq('id', card.id);

            if (updateError) {
              throw updateError;
            }
          }

          updated++;
          console.log(`   ✅ ${card.card_id}: Image found and updated`);
        } else {
          // Image doesn't exist
          if (!dryRun) {
            await supabase
              .from('pokemon_card_attributes')
              .update({ 
                image_validated: false,
                image_validation_error: validation.error,
                image_validated_at: new Date().toISOString()
              })
              .eq('id', card.id);
          }

          failed++;
          errors.push(`${card.card_id}: ${validation.error}`);
        }
      } catch (error: any) {
        failed++;
        const errorMsg = error.message || 'Unknown error';
        errors.push(`${card.card_id}: ${errorMsg}`);
        console.error(`   ❌ ${card.card_id}: ${errorMsg}`);
      }

      // Progress update every 10 cards
      if ((i + 1) % 10 === 0) {
        console.log(`   📊 Progress: ${i + 1}/${cards.length} (${updated} updated, ${failed} failed)`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        dryRun,
        stats: {
          processed: cards.length,
          updated,
          failed,
        },
        errors: errors.slice(0, 20), // Return first 20 errors
        message: dryRun
          ? `Would update ${updated} cards with images`
          : `Updated ${updated} cards with images (${failed} failed)`,
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

