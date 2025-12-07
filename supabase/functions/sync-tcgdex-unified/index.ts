import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TCGDEX_API_BASE = 'https://api.tcgdex.net/v2';

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
  illustrator?: string;
  rarity?: string;
  set: {
    id: string;
    name: string;
    cardCount?: {
      official?: number;
      total?: number;
    };
  };
  pricing?: {
    cardmarket?: {
      updated?: string;
      unit?: string;
      avg?: number;
      low?: number;
      trend?: number;
      avg1?: number;
      avg7?: number;
      avg30?: number;
      'avg-holo'?: number;
      'low-holo'?: number;
      'trend-holo'?: number;
    };
    tcgplayer?: {
      updated?: string;
      unit?: string;
      normal?: {
        lowPrice?: number;
        midPrice?: number;
        highPrice?: number;
        marketPrice?: number;
        directLowPrice?: number;
      };
      holofoil?: {
        lowPrice?: number;
        midPrice?: number;
        highPrice?: number;
        marketPrice?: number;
        directLowPrice?: number;
      };
      reverse?: {
        lowPrice?: number;
        midPrice?: number;
        highPrice?: number;
        marketPrice?: number;
        directLowPrice?: number;
      };
    };
  };
  dexId?: number[];
  variants?: any;
  legal?: any;
}

interface SyncOptions {
  language?: string;
  setIds?: string[];
  updatePricesOnly?: boolean;
  batchSize?: number;
  priceRefreshDays?: number;
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

    const options: SyncOptions = await req.json().catch(() => ({}));
    const {
      language = 'en',
      setIds = null,
      updatePricesOnly = false,
      batchSize = 25,
      priceRefreshDays = 7
    } = options;

    console.log(`\n🚀 Starting TCGdex Unified Sync`);
    console.log(`   Language: ${language}`);
    console.log(`   Update prices only: ${updatePricesOnly}`);
    console.log(`   Price refresh threshold: ${priceRefreshDays} days`);

    let setsToProcess: string[] = [];

    if (setIds && setIds.length > 0) {
      setsToProcess = setIds;
    } else {
      // Fetch all sets from TCGdex
      console.log(`📦 Fetching all sets from TCGdex...`);
      const setsResponse = await fetch(`${TCGDEX_API_BASE}/${language}/sets`);
      if (!setsResponse.ok) {
        throw new Error(`Failed to fetch sets: ${setsResponse.status}`);
      }
      const sets = await setsResponse.json();
      setsToProcess = sets.map((s: any) => s.id);
      console.log(`   Found ${setsToProcess.length} sets`);
    }

    let totalProcessed = 0;
    let totalUpdated = 0;
    let totalInserted = 0;
    let totalPricesUpdated = 0;
    let totalErrors = 0;
    const results: Record<string, any> = {};

    for (const setId of setsToProcess) {
      try {
        console.log(`\n📦 Processing set: ${setId}`);
        
        // Fetch set details with all cards
        const setResponse = await fetch(`${TCGDEX_API_BASE}/${language}/sets/${setId}`);
        if (!setResponse.ok) {
          console.error(`   ❌ Failed to fetch set ${setId}: ${setResponse.status}`);
          totalErrors++;
          continue;
        }

        const setData = await setResponse.json();
        const cardList = setData.cards || [];
        console.log(`   Found ${cardList.length} cards in ${setData.name || setId}`);

        let setInserted = 0;
        let setUpdated = 0;
        let setPricesUpdated = 0;

        // Process cards in batches
        for (let i = 0; i < cardList.length; i += batchSize) {
          const batch = cardList.slice(i, i + batchSize);
          
          // Fetch full card details with pricing for each card in batch
          const cardPromises = batch.map(async (cardRef: any) => {
            try {
              const cardResponse = await fetch(`${TCGDEX_API_BASE}/${language}/cards/${setId}-${cardRef.localId || cardRef.id}`);
              if (cardResponse.ok) {
                return await cardResponse.json();
              }
              return null;
            } catch {
              return null;
            }
          });

          const cards = (await Promise.all(cardPromises)).filter(Boolean) as TCGdexCard[];
          
          for (const card of cards) {
            try {
              const cardId = `tcgdex_${language}_${card.id}`;
              
              // Check if card exists
              const { data: existingCard } = await supabase
                .from('pokemon_card_attributes')
                .select('id, tcgplayer_prices, cardmarket_prices, last_price_update')
                .eq('card_id', cardId)
                .single();

              // Prepare price data
              const tcgplayerPrices = card.pricing?.tcgplayer ? {
                updated: card.pricing.tcgplayer.updated,
                unit: card.pricing.tcgplayer.unit || 'USD',
                normal: card.pricing.tcgplayer.normal,
                holofoil: card.pricing.tcgplayer.holofoil,
                reverse: card.pricing.tcgplayer.reverse
              } : null;

              const cardmarketPrices = card.pricing?.cardmarket ? {
                updated: card.pricing.cardmarket.updated,
                unit: card.pricing.cardmarket.unit || 'EUR',
                avg: card.pricing.cardmarket.avg,
                low: card.pricing.cardmarket.low,
                trend: card.pricing.cardmarket.trend,
                avg1: card.pricing.cardmarket.avg1,
                avg7: card.pricing.cardmarket.avg7,
                avg30: card.pricing.cardmarket.avg30,
                avgHolo: card.pricing.cardmarket['avg-holo'],
                lowHolo: card.pricing.cardmarket['low-holo'],
                trendHolo: card.pricing.cardmarket['trend-holo']
              } : null;

              const hasPricing = tcgplayerPrices || cardmarketPrices;

              if (existingCard) {
                // Check if we need to update prices
                const lastUpdate = existingCard.last_price_update 
                  ? new Date(existingCard.last_price_update)
                  : null;
                const now = new Date();
                const daysSinceUpdate = lastUpdate 
                  ? (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)
                  : Infinity;

                if (hasPricing && daysSinceUpdate > priceRefreshDays) {
                  // Update prices
                  const { error: updateError } = await supabase
                    .from('pokemon_card_attributes')
                    .update({
                      tcgplayer_prices: tcgplayerPrices,
                      cardmarket_prices: cardmarketPrices,
                      last_price_update: new Date().toISOString(),
                      synced_at: new Date().toISOString()
                    })
                    .eq('id', existingCard.id);

                  if (!updateError) {
                    setPricesUpdated++;
                    totalPricesUpdated++;
                  }
                }

                if (!updatePricesOnly) {
                  // Full update
                  setUpdated++;
                  totalUpdated++;
                }
              } else if (!updatePricesOnly) {
                // Insert new card
                const imageUrl = card.image || `https://assets.tcgdex.net/${language}/${card.set.id}/${card.localId}`;
                
                // Generate printed_number as it appears on the card (e.g., "125/094")
                const printedTotal = card.set.cardCount?.official || card.set.cardCount?.total;
                const printedNumber = printedTotal 
                  ? `${card.localId}/${String(printedTotal).padStart(3, '0')}`
                  : card.localId;
                
                const newCard = {
                  card_id: cardId,
                  name: card.name,
                  set_name: card.set.name || setData.name,
                  set_code: setId,
                  number: card.localId,
                  printed_number: printedNumber,
                  display_number: printedNumber,
                  search_number: card.localId?.replace(/\s/g, '').toLowerCase(),
                  rarity: card.rarity || null,
                  types: card.types || null,
                  supertype: card.category || null,
                  artist: card.illustrator || null,
                  images: {
                    small: `${imageUrl}/low.webp`,
                    large: `${imageUrl}/high.webp`,
                    tcgdex: `${imageUrl}/high.webp`
                  },
                  tcgplayer_prices: tcgplayerPrices,
                  cardmarket_prices: cardmarketPrices,
                  printed_total: printedTotal || null,
                  sync_source: 'tcgdex',
                  synced_at: new Date().toISOString(),
                  last_price_update: hasPricing ? new Date().toISOString() : null,
                  metadata: {
                    hp: card.hp,
                    evolveFrom: card.evolveFrom,
                    stage: card.stage,
                    dexId: card.dexId,
                    variants: card.variants,
                    legal: card.legal,
                    language: language
                  }
                };

                // Use upsert with ignoreDuplicates to prevent duplicates
                const { error: upsertError } = await supabase
                  .from('pokemon_card_attributes')
                  .upsert(newCard, { 
                    onConflict: 'card_id',
                    ignoreDuplicates: true // Don't overwrite existing data
                  });

                if (!upsertError) {
                  setInserted++;
                  totalInserted++;
                } else {
                  console.error(`   ❌ Upsert error for ${card.name}:`, upsertError.message);
                  totalErrors++;
                }
              }

              totalProcessed++;
            } catch (cardError) {
              console.error(`   ❌ Error processing card:`, cardError);
              totalErrors++;
            }
          }

          // Small delay between batches
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        results[setId] = {
          inserted: setInserted,
          updated: setUpdated,
          pricesUpdated: setPricesUpdated
        };

        console.log(`   ✅ ${setId}: ${setInserted} inserted, ${setUpdated} updated, ${setPricesUpdated} prices refreshed`);

      } catch (setError) {
        console.error(`❌ Error processing set ${setId}:`, setError);
        totalErrors++;
      }
    }

    console.log(`\n🎉 Sync complete!`);
    console.log(`📊 Stats:`);
    console.log(`   Total processed: ${totalProcessed}`);
    console.log(`   New cards inserted: ${totalInserted}`);
    console.log(`   Cards updated: ${totalUpdated}`);
    console.log(`   Prices refreshed: ${totalPricesUpdated}`);
    console.log(`   Errors: ${totalErrors}`);

    return new Response(
      JSON.stringify({
        success: true,
        language,
        stats: {
          totalProcessed,
          totalInserted,
          totalUpdated,
          totalPricesUpdated,
          totalErrors,
          setsProcessed: setsToProcess.length
        },
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Sync error:', error);
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

