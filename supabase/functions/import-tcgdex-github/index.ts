import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getEnglishName } from "../_shared/pokemon-names.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TCGDEX_GITHUB_BASE = 'https://raw.githubusercontent.com/tcgdex/cards-database/master';

interface TCGdexCard {
  id: string;
  localId: string;
  name: string;
  image?: string;
  category: string;
  hp?: number;
  types?: string[];
  evolveFrom?: string;
  stage?: string;
  suffix?: string;
  item?: any;
  abilities?: any[];
  attacks?: any[];
  weaknesses?: any[];
  resistances?: any[];
  retreat?: number;
  effect?: string;
  trainerType?: string;
  energyType?: string;
  regulationMark?: string;
  legal?: any;
  illustrator?: string;
  rarity?: string;
  set: {
    id: string;
    name: string;
    logo?: string;
    symbol?: string;
    cardCount: {
      official?: number;
      total?: number;
    };
  };
  dexId?: number[];
  variants?: any;
}

// Map language codes to their directory paths
function getLanguageDir(language: string): string {
  const langMap: Record<string, string> = {
    'en': 'data/cards/en',
    'ja': 'data-asia/cards/ja',
    'fr': 'data/cards/fr',
    'de': 'data/cards/de',
    'es': 'data/cards/es',
    'it': 'data/cards/it',
    'pt': 'data/cards/pt',
    'ko': 'data-asia/cards/ko',
    'zh': 'data-asia/cards/zh-tw',
    'id': 'data-asia/cards/id',
    'th': 'data-asia/cards/th',
  };
  return langMap[language] || 'data/cards/en';
}

// Map set codes to series directories
function getSeriesDir(setCode: string): string {
  const code = setCode.toLowerCase();
  
  // Scarlet & Violet series
  if (code.startsWith('sv')) return 'sv';
  
  // Sword & Shield series
  if (code.startsWith('swsh') || code.match(/^s\d/)) return 'swsh';
  
  // Sun & Moon series
  if (code.startsWith('sm')) return 'sm';
  
  // XY series
  if (code.startsWith('xy')) return 'xy';
  
  // Black & White series
  if (code.startsWith('bw')) return 'bw';
  
  // HeartGold SoulSilver / older series
  if (code.startsWith('hgss') || code.startsWith('pl') || code.startsWith('dp')) return 'dp';
  
  // Base, Jungle, Fossil, etc.
  if (['base1', 'base2', 'base3', 'base4', 'base5', 'gym1', 'gym2', 'neo1', 'neo2', 'neo3', 'neo4'].includes(code)) {
    return 'base';
  }
  
  // Default to the set code as series
  return code;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      language = 'en',
      region = 'international', // 'international' or 'asia'
      setIds = null,
      batchSize = 50 
    } = await req.json().catch(() => ({}));

    console.log(`\n🚀 Starting TCGdex GitHub import for ${language} (${region})`);
    
    const languageDir = getLanguageDir(language);
    
    // Fetch the directory listing to get all series
    const seriesUrl = `${TCGDEX_GITHUB_BASE}/${languageDir}`;
    console.log(`📂 Fetching series list from: ${seriesUrl}`);
    
    // For GitHub, we need to manually specify which sets to import since we can't list directories
    // We'll fetch specific sets if provided, or a predefined list
    const defaultSets = language === 'ja' && region === 'asia' 
      ? ['sv4a', 'sv1', 'sv2', 'sv3', 'sv4', 'sv5', 'sv6'] // Japanese sets
      : ['base1', 'sv01', 'sv02', 'sv03', 'sv04', 'sv05']; // English sets
    
    const setsToImport = setIds || defaultSets;
    console.log(`📦 Sets to import: ${setsToImport.join(', ')}`);

    let totalImported = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    const processedSets: string[] = [];
    const failedSets: string[] = [];
    const setResults: Record<string, { imported: number; skipped: number; errors: number }> = {};

    for (const setId of setsToImport) {
      try {
        console.log(`\n📦 Processing set: ${setId}`);
        
        const series = getSeriesDir(setId);
        const setBaseUrl = `${TCGDEX_GITHUB_BASE}/${languageDir}/${series}/${setId}`;
        
        // Try to fetch the set's card list (we'll need to know the card IDs)
        // GitHub doesn't provide directory listings, so we'll try fetching cards by number
        // First, let's try to get a reasonable range (1-400 should cover most sets)
        
        const cards: TCGdexCard[] = [];
        const maxCardNumber = 400; // Reasonable maximum
        
        console.log(`🔍 Scanning for cards in ${setId}...`);
        
        // Try fetching cards in batches
        for (let i = 1; i <= maxCardNumber; i++) {
          const paddedNum = i.toString().padStart(3, '0');
          const cardUrl = `${setBaseUrl}/${paddedNum}.json`;
          
          try {
            const cardResponse = await fetch(cardUrl);
            if (cardResponse.ok) {
              const cardData: TCGdexCard = await cardResponse.json();
              cards.push(cardData);
              
              if (i % 50 === 0) {
                console.log(`   Found ${cards.length} cards so far...`);
              }
            } else if (cardResponse.status === 404) {
              // Card doesn't exist, continue
              continue;
            } else {
              console.warn(`   Unexpected status ${cardResponse.status} for card ${paddedNum}`);
            }
          } catch (err) {
            // Network error or other issue, skip this card
            continue;
          }
          
          // Small delay to avoid rate limiting
          if (i % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        
        if (cards.length === 0) {
          console.log(`⚠️  No cards found for set ${setId}`);
          failedSets.push(setId);
          continue;
        }
        
        console.log(`✅ Found ${cards.length} cards in ${setId}`);
        
        // Check which cards already exist
        const cardIds = cards.map(c => `tcgdex_github_${language}_${c.id}`);
        const { data: existingCards } = await supabase
          .from('pokemon_card_attributes')
          .select('card_id')
          .in('card_id', cardIds);

        const existingCardIds = new Set(existingCards?.map(c => c.card_id) || []);
        const newCards = cards.filter(c => !existingCardIds.has(`tcgdex_github_${language}_${c.id}`));
        
        console.log(`   ${newCards.length} new cards to import, ${existingCards?.length || 0} already exist`);
        
        let setImported = 0;
        const setSkipped = existingCards?.length || 0;
        let setErrors = 0;

        // Process cards in batches
        for (let i = 0; i < newCards.length; i += batchSize) {
          const batch = newCards.slice(i, i + batchSize);
          
          const cardsToInsert = batch.map(card => {
            // Construct image URL using TCGdex CDN
            const imageUrl = card.image || 
              `https://assets.tcgdex.net/${language}/${series}/${setId}/${card.localId}`;
            
            // Get English name for non-English cards using dexId
            const englishName = language !== 'en' ? getEnglishName(card.dexId) : null;
            
            return {
              card_id: `tcgdex_github_${language}_${card.id}`,
              name: card.name,
              name_en: englishName, // Auto-populate English name for Japanese/other language cards
              set_name: card.set.name,
              set_code: setId,
              number: card.localId,
              display_number: card.localId, // TCGdex uses localId as the display number
              search_number: card.localId.replace(/\s/g, '').toLowerCase(),
              rarity: card.rarity || null,
              types: card.types || null,
              supertype: card.category || null,
              subtypes: card.stage ? [card.stage] : null,
              artist: card.illustrator || null,
              images: {
                small: imageUrl,
                large: imageUrl,
                tcgdex_github: imageUrl
              },
              printed_total: card.set.cardCount?.official || card.set.cardCount?.total || null,
              sync_source: 'tcgdex_github',
              synced_at: new Date().toISOString(),
              metadata: {
                hp: card.hp,
                evolveFrom: card.evolveFrom,
                stage: card.stage,
                suffix: card.suffix,
                abilities: card.abilities,
                attacks: card.attacks,
                weaknesses: card.weaknesses,
                resistances: card.resistances,
                retreat: card.retreat,
                effect: card.effect,
                trainerType: card.trainerType,
                energyType: card.energyType,
                regulationMark: card.regulationMark,
                dexId: card.dexId,
                variants: card.variants,
                legal: card.legal,
                language: language,
                region: region,
                setLogo: card.set.logo,
                setSymbol: card.set.symbol,
                category: card.category
              }
            };
          });

          // Use upsert with ignoreDuplicates to prevent duplicates
          const { error: upsertError } = await supabase
            .from('pokemon_card_attributes')
            .upsert(cardsToInsert, { 
              onConflict: 'card_id',
              ignoreDuplicates: true // Don't update existing records
            });

          if (upsertError) {
            console.error(`   ❌ Error upserting batch:`, upsertError);
            setErrors += batch.length;
            totalErrors += batch.length;
          } else {
            setImported += batch.length;
            totalImported += batch.length;
            console.log(`   ✅ Upserted batch of ${batch.length} cards (${setImported}/${newCards.length})`);
          }

          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        totalSkipped += setSkipped;
        processedSets.push(setId);
        setResults[setId] = { imported: setImported, skipped: setSkipped, errors: setErrors };
        
        console.log(`✅ Completed ${setId}: ${setImported} imported, ${setSkipped} skipped, ${setErrors} errors`);

      } catch (err) {
        console.error(`❌ Error processing set ${setId}:`, err);
        failedSets.push(setId);
        totalErrors++;
      }
    }

    console.log(`\n🎉 Import complete!`);
    console.log(`📊 Total Stats: ${totalImported} imported, ${totalSkipped} skipped, ${totalErrors} errors`);
    console.log(`✅ Processed sets: ${processedSets.join(', ')}`);
    if (failedSets.length > 0) {
      console.log(`❌ Failed sets: ${failedSets.join(', ')}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        language,
        region,
        stats: {
          totalImported,
          totalSkipped,
          totalErrors,
          setsProcessed: processedSets.length,
          setsFailed: failedSets.length
        },
        processedSets,
        failedSets,
        setResults
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
    
  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
