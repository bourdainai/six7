import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getEnglishName } from "../_shared/pokemon-names.ts";
import { getEnglishSetName } from "../_shared/japanese-set-names.ts";
import { requireCronAuth, handleCORS, createUnauthorizedResponse, getCorsHeaders } from "../_shared/cron-auth.ts";

const corsHeaders = getCorsHeaders();

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
  
  if (code.startsWith('sv')) return 'sv';
  if (code.startsWith('swsh') || code.match(/^s\d/)) return 'swsh';
  if (code.startsWith('sm')) return 'sm';
  if (code.startsWith('xy')) return 'xy';
  if (code.startsWith('bw')) return 'bw';
  if (code.startsWith('hgss') || code.startsWith('pl') || code.startsWith('dp')) return 'dp';
  if (['base1', 'base2', 'base3', 'base4', 'base5', 'gym1', 'gym2', 'neo1', 'neo2', 'neo3', 'neo4'].includes(code)) {
    return 'base';
  }
  
  return code;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCORS();
  }

  // Require cron authentication
  const authResult = await requireCronAuth(req);
  if (!authResult.authorized) {
    console.warn(`Unauthorized access attempt to import-tcgdex-github: ${authResult.reason}`);
    return createUnauthorizedResponse(authResult.reason);
  }

  console.log(`Authenticated via: ${authResult.authType}`);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      language = 'en',
      region = 'international',
      setIds = null,
      batchSize = 50 
    } = await req.json().catch(() => ({}));

    console.log(`\n🚀 Starting TCGdex GitHub import for ${language} (${region})`);
    
    const languageDir = getLanguageDir(language);
    const seriesUrl = `${TCGDEX_GITHUB_BASE}/${languageDir}`;
    console.log(`📂 Fetching series list from: ${seriesUrl}`);
    
    const defaultSets = language === 'ja' && region === 'asia' 
      ? ['sv4a', 'sv1', 'sv2', 'sv3', 'sv4', 'sv5', 'sv6']
      : ['base1', 'sv01', 'sv02', 'sv03', 'sv04', 'sv05'];
    
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
        
        const cards: TCGdexCard[] = [];
        const maxCardNumber = 400;
        
        console.log(`🔍 Scanning for cards in ${setId}...`);
        
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
              continue;
            } else {
              console.warn(`   Unexpected status ${cardResponse.status} for card ${paddedNum}`);
            }
          } catch (err) {
            continue;
          }
          
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

        for (let i = 0; i < newCards.length; i += batchSize) {
          const batch = newCards.slice(i, i + batchSize);
          
          const cardsToInsert = batch.map(card => {
            const imageUrl = card.image || 
              `https://assets.tcgdex.net/${language}/${series}/${setId}/${card.localId}`;
            
            const englishName = language !== 'en' ? getEnglishName(card.dexId) : null;
            const englishSetName = language !== 'en' ? getEnglishSetName(setId) : null;
            
            const printedTotal = card.set.cardCount?.official || card.set.cardCount?.total;
            const printedNumber = printedTotal 
              ? `${card.localId}/${String(printedTotal).padStart(3, '0')}`
              : card.localId;

            return {
              card_id: `tcgdex_github_${language}_${card.id}`,
              name: card.name,
              name_en: englishName,
              set_name: card.set.name,
              set_name_en: englishSetName,
              set_code: setId,
              number: card.localId,
              printed_number: printedNumber,
              display_number: printedNumber,
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
              printed_total: printedTotal || null,
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

          const { error: upsertError } = await supabase
            .from('pokemon_card_attributes')
            .upsert(cardsToInsert, { 
              onConflict: 'card_id',
              ignoreDuplicates: true
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
