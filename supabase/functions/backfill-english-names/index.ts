import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdmin, handleCORS, createErrorResponse } from '../_shared/admin-middleware.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TCGDEX_API_BASE = 'https://api.tcgdex.net/v2';
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 200;

/**
 * Exponential backoff delay
 */
async function delayWithBackoff(attemptNumber: number): Promise<void> {
  const delay = BASE_DELAY_MS * Math.pow(2, attemptNumber);
  await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Fetch card with retry logic
 */
async function fetchCardWithRetry(url: string, retries = MAX_RETRIES): Promise<any> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url);
      
      if (response.ok) {
        return await response.json();
      }
      
      if (response.status === 404) {
        return null; // Card doesn't exist
      }
      
      if (response.status === 429) {
        // Rate limited, wait longer
        await delayWithBackoff(attempt + 2);
        continue;
      }
      
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      
    } catch (error) {
      if (attempt === retries - 1) throw error;
      await delayWithBackoff(attempt);
    }
  }
  
  throw new Error('Max retries exceeded');
}

/**
 * Extract set code and local ID from card_id
 */
function parseCardId(cardId: string): { setCode: string; localId: string } | null {
  // Format: tcgdex_github_ja_setcode-localid or tcgdx_ja_S9a-033 (legacy)
  const githubMatch = cardId.match(/tcgdex_github_ja_([A-Za-z0-9]+)-(.+)/i);
  if (githubMatch) {
    return { setCode: githubMatch[1], localId: githubMatch[2] };
  }

  // Legacy format: tcgdx_ja_S9a-033 or tcgdex_ja_S9a_033
  const legacyMatch = cardId.match(/tcgd[ex]+_ja_([A-Z0-9]+)[-_](.+)/i);
  if (legacyMatch) {
    return { setCode: legacyMatch[1], localId: legacyMatch[2] };
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

    console.log(`🌐 Backfilling English names (dryRun: ${dryRun}, batchSize: ${batchSize})`);

    // Fetch Japanese cards without English names
    let query = supabase
      .from('pokemon_card_attributes')
      .select('id, card_id, name, set_code, number')
      .or('name_en.is.null,name_en.eq.')
      .or('card_id.ilike.tcgdex_github_ja_%,card_id.ilike.tcgdx_ja_%,card_id.ilike.%_ja_%')
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
          message: 'No cards need English names',
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
      
      // Parse card_id to get set code and local ID
      const parsed = parseCardId(card.card_id);
      
      if (!parsed) {
        console.warn(`   ⚠️ Could not parse card_id: ${card.card_id}`);
        failed++;
        errors.push(`${card.card_id}: Could not parse card_id`);
        continue;
      }

      const { setCode, localId } = parsed;

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));

      try {
        // Fetch English version from TCGdx API
        const englishCardUrl = `${TCGDEX_API_BASE}/en/sets/${setCode}/${localId}`;
        const englishCard = await fetchCardWithRetry(englishCardUrl);

        if (englishCard && englishCard.name) {
          if (!dryRun) {
            const { error: updateError } = await supabase
              .from('pokemon_card_attributes')
              .update({ name_en: englishCard.name })
              .eq('id', card.id);

            if (updateError) {
              throw updateError;
            }
          }

          updated++;
          console.log(`   ✅ ${card.card_id}: ${card.name} → ${englishCard.name}`);
        } else {
          failed++;
          errors.push(`${card.card_id}: English name not found in API`);
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
          ? `Would update ${updated} cards with English names`
          : `Updated ${updated} cards with English names (${failed} failed)`,
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
