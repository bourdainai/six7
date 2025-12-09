import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdmin, handleCORS, createErrorResponse } from '../_shared/admin-middleware.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
        'User-Agent': '6Seven-ImageValidator/1.0',
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
 * Validate images for a batch of cards
 */
async function validateCardImages(
  supabase: any,
  cards: Array<{ id: string; images: any; card_id: string }>,
  dryRun = false
): Promise<{ validated: number; invalid: number; errors: string[] }> {
  let validated = 0;
  let invalid = 0;
  const errors: string[] = [];

  for (const card of cards) {
    const images = typeof card.images === 'string' 
      ? JSON.parse(card.images) 
      : card.images || {};

    const imageUrl = images.large || images.small || null;

    if (!imageUrl) {
      // No image URL - mark as invalid
      if (!dryRun) {
        await supabase
          .from('pokemon_card_attributes')
          .update({
            image_validated: false,
            image_validation_error: 'No image URL',
            image_validated_at: new Date().toISOString(),
          })
          .eq('id', card.id);
      }
      invalid++;
      continue;
    }

    // Validate the image URL
    const validation = await validateImageUrl(imageUrl);

    if (!dryRun) {
      await supabase
        .from('pokemon_card_attributes')
        .update({
          image_validated: validation.valid,
          image_validation_error: validation.valid ? null : validation.error,
          image_validated_at: new Date().toISOString(),
        })
        .eq('id', card.id);
    }

    if (validation.valid) {
      validated++;
    } else {
      invalid++;
      errors.push(`${card.card_id}: ${validation.error}`);
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return { validated, invalid, errors };
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
      cardIds = null,
      validateAll = false 
    } = await req.json().catch(() => ({}));

    console.log(`🔍 Image validation (dryRun: ${dryRun}, batchSize: ${batchSize})`);

    let cardsToValidate: Array<{ id: string; images: any; card_id: string }> = [];

    if (cardIds && Array.isArray(cardIds)) {
      // Validate specific cards
      const { data, error } = await supabase
        .from('pokemon_card_attributes')
        .select('id, images, card_id')
        .in('id', cardIds);

      if (error) throw error;
      cardsToValidate = data || [];
    } else if (validateAll) {
      // Validate all cards with images that haven't been validated
      const BATCH_SIZE = 1000;
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('pokemon_card_attributes')
          .select('id, images, card_id')
          .or('image_validated.is.null,image_validated.eq.false')
          .not('images', 'is', null)
          .range(from, from + BATCH_SIZE - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          cardsToValidate = cardsToValidate.concat(data);
          from += BATCH_SIZE;
          hasMore = data.length === BATCH_SIZE;
        } else {
          hasMore = false;
        }
      }
    } else {
      // Validate a sample batch
      const { data, error } = await supabase
        .from('pokemon_card_attributes')
        .select('id, images, card_id')
        .or('image_validated.is.null,image_validated.eq.false')
        .not('images', 'is', null)
        .limit(batchSize);

      if (error) throw error;
      cardsToValidate = data || [];
    }

    console.log(`📊 Found ${cardsToValidate.length} cards to validate`);

    if (cardsToValidate.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No cards need validation',
          stats: { validated: 0, invalid: 0, total: 0 },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process in batches
    const BATCH_SIZE = batchSize;
    let totalValidated = 0;
    let totalInvalid = 0;
    const allErrors: string[] = [];

    for (let i = 0; i < cardsToValidate.length; i += BATCH_SIZE) {
      const batch = cardsToValidate.slice(i, i + BATCH_SIZE);
      console.log(`   Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(cardsToValidate.length / BATCH_SIZE)}`);

      const result = await validateCardImages(supabase, batch, dryRun);
      totalValidated += result.validated;
      totalInvalid += result.invalid;
      allErrors.push(...result.errors);
    }

    return new Response(
      JSON.stringify({
        success: true,
        dryRun,
        stats: {
          validated: totalValidated,
          invalid: totalInvalid,
          total: cardsToValidate.length,
        },
        errors: allErrors.slice(0, 20), // Return first 20 errors
        message: dryRun
          ? `Would validate ${cardsToValidate.length} cards (${totalValidated} valid, ${totalInvalid} invalid)`
          : `Validated ${cardsToValidate.length} cards (${totalValidated} valid, ${totalInvalid} invalid)`,
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
