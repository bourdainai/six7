import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Check if text contains Japanese characters
function containsJapanese(text: string): boolean {
  return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
}

// All known card suffixes
const CARD_SUFFIXES = [
  'VSTAR', 'VMAX', 'LEGEND', 'BREAK', 'LV.X', 
  'Prism', 'GX', 'EX', 'ex', 'V', 'δ', '◇', '☆',
  'FB', 'GL', 'G', 'C', '4', 'E4',
];

// Japanese regional prefixes → English
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
  'げんし': 'Primal ',
  'ホワイト': 'White ',
  'ブラック': 'Black ',
  'かがやく': 'Radiant ',
};

// Common trainer names Japanese → English
const TRAINER_NAMES: Record<string, string> = {
  'リーリエ': 'Lillie',
  'シロナ': 'Cynthia',
  'マリィ': 'Marnie',
  'ナンジャモ': 'Iono',
  'デンボク': 'Adaman',
  'カイ': 'Irida',
  'アクロマ': 'Colress',
  'ヒビキ': 'Ethan',
  'コトネ': 'Lyra',
  'レッド': 'Red',
  'グリーン': 'Blue',
  'リーフ': 'Leaf',
  'フウロ': 'Skyla',
  'カミツレ': 'Elesa',
  'アイリス': 'Iris',
  'セレナ': 'Serena',
  'カルネ': 'Diantha',
  'ククイ博士': 'Professor Kukui',
  'オーキド博士': 'Professor Oak',
  'プラターヌ博士': 'Professor Sycamore',
  'マグノリア博士': 'Professor Magnolia',
  'ボスの指令': "Boss's Orders",
  'ポケモンいれかえ': 'Switch',
  'ハイパーボール': 'Ultra Ball',
  'ネストボール': 'Nest Ball',
  'クイックボール': 'Quick Ball',
  'ふしぎなアメ': 'Rare Candy',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { batchSize = 1000, offset = 0 } = await req.json().catch(() => ({}));

    console.log(`Backfilling English names - batch: ${batchSize}, offset: ${offset}`);

    // Get the translation lookup table
    const { data: translations, error: transError } = await supabase
      .from('pokemon_english_names')
      .select('japanese_name, english_name');

    if (transError) throw new Error(`Failed to load translations: ${transError.message}`);

    // Build lookup map
    const japaneseToEnglish = new Map<string, string>();
    for (const t of translations || []) {
      japaneseToEnglish.set(t.japanese_name, t.english_name);
    }
    for (const [jp, en] of Object.entries(TRAINER_NAMES)) {
      japaneseToEnglish.set(jp, en);
    }

    console.log(`Loaded ${japaneseToEnglish.size} translations`);

    // Get all Japanese names for matching
    const japaneseNames = Array.from(japaneseToEnglish.keys());
    
    // Find cards needing English names - prioritize cards that start with known Pokemon names
    // or contain no Japanese characters (already English)
    const { data: cards, error: cardsError } = await supabase
      .from('pokemon_card_attributes')
      .select('id, card_id, name, name_en')
      .is('name_en', null)
      .limit(batchSize);

    if (cardsError) throw new Error(`Failed to fetch cards: ${cardsError.message}`);

    console.log(`Found ${cards?.length || 0} cards to process`);

    if (!cards || cards.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No more cards', processed: 0, remaining: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let updated = 0;
    let alreadyEnglish = 0;
    let translated = 0;
    const updates: { id: string; name_en: string }[] = [];

    for (const card of cards) {
      const name = card.name?.trim();
      if (!name) continue;

      let englishName: string | null = null;

      // Case 1: Name is already in English (no Japanese characters)
      if (!containsJapanese(name)) {
        englishName = name;
        alreadyEnglish++;
      } 
      // Case 2: Name is Japanese - try to translate
      else {
        // Direct lookup first
        if (japaneseToEnglish.has(name)) {
          englishName = japaneseToEnglish.get(name)!;
          translated++;
        } else {
          let baseName = name;
          let suffix = '';
          let prefix = '';
          
          // Extract suffix (try longest match first)
          const sortedSuffixes = [...CARD_SUFFIXES].sort((a, b) => b.length - a.length);
          for (const s of sortedSuffixes) {
            if (baseName.endsWith(s)) {
              suffix = s;
              baseName = baseName.slice(0, -s.length).trim();
              break;
            }
          }

          // Extract prefix
          for (const [jpPrefix, enPrefix] of Object.entries(REGION_PREFIXES)) {
            if (baseName.startsWith(jpPrefix)) {
              prefix = enPrefix;
              baseName = baseName.slice(jpPrefix.length).trim();
              break;
            }
          }

          // Try lookup with cleaned base name
          if (japaneseToEnglish.has(baseName)) {
            englishName = prefix + japaneseToEnglish.get(baseName)!;
            if (suffix) englishName += ` ${suffix}`;
            translated++;
          } else {
            // Try to find a partial match - check if any known name is contained
            for (const [jpName, enName] of japaneseToEnglish.entries()) {
              if (baseName.startsWith(jpName) && jpName.length >= 3) {
                const remainder = baseName.slice(jpName.length).trim();
                englishName = prefix + enName;
                if (remainder) englishName += ` ${remainder}`;
                if (suffix) englishName += ` ${suffix}`;
                translated++;
                break;
              }
            }
          }
        }
      }

      if (englishName) {
        updates.push({ id: card.id, name_en: englishName });
      }
    }

    console.log(`Matched: ${updates.length} (${alreadyEnglish} already English, ${translated} translated)`);

    // Batch update
    for (const update of updates) {
      const { error } = await supabase
        .from('pokemon_card_attributes')
        .update({ name_en: update.name_en })
        .eq('id', update.id);
      if (!error) updated++;
    }

    console.log(`Updated ${updated} cards`);

    // Count remaining
    const { count } = await supabase
      .from('pokemon_card_attributes')
      .select('id', { count: 'exact', head: true })
      .is('name_en', null);

    return new Response(
      JSON.stringify({
        success: true,
        processed: cards.length,
        matched: updates.length,
        alreadyEnglish,
        translated,
        updated,
        remaining: count || 0,
        nextOffset: offset + batchSize,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
