import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Japanese suffix patterns
const JP_SUFFIXES = ['EX', 'ex', 'GX', 'V', 'VMAX', 'VSTAR', 'δ', 'Prism'];

// Common Japanese prefixes with English equivalents
const REGION_PREFIXES: Record<string, string> = {
  'ヒスイの': 'Hisuian ',
  'ヒスイ': 'Hisuian ',
  'パルデアの': 'Paldean ',
  'パルデア': 'Paldean ',
  'ガラルの': 'Galarian ',
  'ガラル': 'Galarian ',
  'アローラの': 'Alolan ',
  'アローラ': 'Alolan ',
  'メガ': 'Mega ',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { batchSize = 500, offset = 0 } = await req.json().catch(() => ({}));

    console.log(`Backfilling English names using local lookup - batch size: ${batchSize}, offset: ${offset}`);

    // Get the translation lookup table
    const { data: translations, error: transError } = await supabase
      .from('pokemon_english_names')
      .select('dex_id, japanese_name, english_name');

    if (transError) {
      throw new Error(`Failed to load translations: ${transError.message}`);
    }

    console.log(`Loaded ${translations?.length || 0} translation entries`);

    // Build lookup maps
    const japaneseToEnglish = new Map<string, string>();

    for (const t of translations || []) {
      japaneseToEnglish.set(t.japanese_name, t.english_name);
    }

    // Find cards needing English names
    const { data: cards, error: cardsError } = await supabase
      .from('pokemon_card_attributes')
      .select('id, card_id, name, name_en')
      .is('name_en', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + batchSize - 1);

    if (cardsError) {
      throw new Error(`Failed to fetch cards: ${cardsError.message}`);
    }

    console.log(`Found ${cards?.length || 0} cards needing English names`);

    if (!cards || cards.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No more cards to process',
          processed: 0,
          remaining: 0,
          offset,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let updated = 0;
    const updates: { id: string; name_en: string }[] = [];

    for (const card of cards) {
      const japName = card.name;
      let englishName: string | null = null;

      // Try direct lookup first
      if (japaneseToEnglish.has(japName)) {
        englishName = japaneseToEnglish.get(japName)!;
      } else {
        // Try extracting base name by removing suffixes
        let baseName = japName;
        let suffix = '';

        for (const s of JP_SUFFIXES) {
          if (baseName.endsWith(s)) {
            suffix = s;
            baseName = baseName.slice(0, -s.length).trim();
            break;
          }
        }

        // Check for regional prefixes
        let prefix = '';
        for (const [jpPrefix, enPrefix] of Object.entries(REGION_PREFIXES)) {
          if (baseName.startsWith(jpPrefix)) {
            prefix = enPrefix;
            baseName = baseName.slice(jpPrefix.length).trim();
            break;
          }
        }

        // Try lookup with base name
        if (japaneseToEnglish.has(baseName)) {
          englishName = prefix + japaneseToEnglish.get(baseName)! + (suffix ? ` ${suffix}` : '');
        }
      }

      if (englishName) {
        updates.push({ id: card.id, name_en: englishName });
      }
    }

    console.log(`Found ${updates.length} cards to update`);

    // Apply updates in batch
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('pokemon_card_attributes')
        .update({ name_en: update.name_en })
        .eq('id', update.id);

      if (!updateError) {
        updated++;
      } else {
        console.error(`Failed to update card ${update.id}:`, updateError);
      }
    }

    console.log(`Updated ${updated}/${cards.length} cards with English names`);

    // Check if there are more cards to process
    const { count } = await supabase
      .from('pokemon_card_attributes')
      .select('id', { count: 'exact', head: true })
      .is('name_en', null);

    return new Response(
      JSON.stringify({
        success: true,
        processed: cards.length,
        matched: updates.length,
        updated,
        remaining: count || 0,
        nextOffset: offset + batchSize,
        message: `Updated ${updated} cards. ${count || 0} remaining without English names.`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error backfilling English names:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to backfill English names', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
