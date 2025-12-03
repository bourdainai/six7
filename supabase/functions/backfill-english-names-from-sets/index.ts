import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Backfill English names for Japanese cards by matching to English equivalents
 * in the same set using set_code + card number.
 * 
 * This is much smarter than AI translation because:
 * - Card sv4a-001 in Japanese = Card sv4a-001 in English (same card!)
 * - We just copy the name from the English version
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { batchSize = 500, dryRun = false } = await req.json().catch(() => ({}));

    console.log(`🚀 Starting cross-language set matching (batchSize: ${batchSize}, dryRun: ${dryRun})`);

    // Step 1: Get Japanese cards that still need English names
    const { data: japaneseCards, error: fetchError } = await supabase
      .from('pokemon_card_attributes')
      .select('id, card_id, name, set_code, number, display_number')
      .is('name_en', null)
      .like('card_id', 'tcgdex_ja_%')
      .limit(batchSize);

    if (fetchError) {
      throw new Error(`Failed to fetch Japanese cards: ${fetchError.message}`);
    }

    console.log(`📦 Found ${japaneseCards?.length || 0} Japanese cards without English names`);

    if (!japaneseCards || japaneseCards.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No Japanese cards need English names',
          stats: { processed: 0, matched: 0, notFound: 0 }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Get unique set_code + number combinations we need to look up
    const lookupKeys = japaneseCards.map(card => ({
      set_code: card.set_code,
      number: card.number,
      display_number: card.display_number
    }));

    // Step 3: Find matching English cards for these set_code + number combinations
    // Build a map of set_code:number -> English name
    const englishNameMap = new Map<string, string>();
    
    // Get unique set codes
    const uniqueSetCodes = [...new Set(lookupKeys.map(k => k.set_code).filter(Boolean))];
    
    console.log(`🔍 Looking up English cards in ${uniqueSetCodes.length} sets...`);

    for (const setCode of uniqueSetCodes) {
      // Get all English cards in this set (any prefix that's NOT Japanese)
      const { data: englishCards, error: englishError } = await supabase
        .from('pokemon_card_attributes')
        .select('name, number, display_number')
        .eq('set_code', setCode)
        .not('card_id', 'like', 'tcgdex_ja_%');

      if (englishError) {
        console.warn(`⚠️ Failed to fetch English cards for set ${setCode}: ${englishError.message}`);
        continue;
      }

      // Add to map
      for (const card of englishCards || []) {
        // Try multiple key formats for matching
        if (card.number) {
          englishNameMap.set(`${setCode}:${card.number}`, card.name);
        }
        if (card.display_number && card.display_number !== card.number) {
          englishNameMap.set(`${setCode}:${card.display_number}`, card.name);
        }
      }
    }

    console.log(`📚 Built English name map with ${englishNameMap.size} entries`);

    // Step 4: Match Japanese cards to English names
    const updates: Array<{ id: string; name_en: string; jaName: string }> = [];
    const notFound: Array<{ id: string; name: string; set_code: string; number: string }> = [];

    for (const card of japaneseCards) {
      // Try to find matching English name
      let englishName: string | undefined;
      
      // Try with number
      if (card.set_code && card.number) {
        englishName = englishNameMap.get(`${card.set_code}:${card.number}`);
      }
      
      // Try with display_number if number didn't match
      if (!englishName && card.set_code && card.display_number) {
        englishName = englishNameMap.get(`${card.set_code}:${card.display_number}`);
      }

      if (englishName) {
        updates.push({ id: card.id, name_en: englishName, jaName: card.name });
        console.log(`✅ ${card.name} → ${englishName} (${card.set_code}/${card.number})`);
      } else {
        notFound.push({ 
          id: card.id, 
          name: card.name, 
          set_code: card.set_code || 'unknown',
          number: card.number || 'unknown'
        });
      }
    }

    console.log(`\n📊 Results: ${updates.length} matches found, ${notFound.length} not found`);

    // Step 5: Apply updates
    let updatedCount = 0;
    
    if (!dryRun && updates.length > 0) {
      // Update in batches
      for (let i = 0; i < updates.length; i += 100) {
        const batch = updates.slice(i, i + 100);
        
        for (const update of batch) {
          const { error: updateError } = await supabase
            .from('pokemon_card_attributes')
            .update({ name_en: update.name_en })
            .eq('id', update.id);

          if (updateError) {
            console.error(`❌ Failed to update ${update.id}: ${updateError.message}`);
          } else {
            updatedCount++;
          }
        }
        
        console.log(`   Updated batch ${Math.floor(i / 100) + 1}/${Math.ceil(updates.length / 100)}`);
      }
    }

    // Step 6: Return results
    const stats = {
      processed: japaneseCards.length,
      matched: updates.length,
      updated: dryRun ? 0 : updatedCount,
      notFound: notFound.length,
      setsSearched: uniqueSetCodes.length,
      englishCardsIndexed: englishNameMap.size
    };

    console.log(`\n🎉 Set matching complete!`);
    console.log(`   Processed: ${stats.processed}`);
    console.log(`   Matched: ${stats.matched}`);
    console.log(`   Updated: ${stats.updated}`);
    console.log(`   Not Found: ${stats.notFound}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: dryRun ? 'Dry run complete' : 'Set matching complete',
        stats,
        sampleMatches: updates.slice(0, 10).map(u => ({ ja: u.jaName, en: u.name_en })),
        sampleNotFound: notFound.slice(0, 10)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Set matching error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

