import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireCronAuth, handleCORS, createUnauthorizedResponse, getCorsHeaders } from "../_shared/cron-auth.ts";

const corsHeaders = getCorsHeaders();

// Helper function to map set codes to their series paths in TCGdex
function getSeriesFromSetCode(setCode: string): string {
  if (setCode.startsWith('SV')) return 'sv';
  if (setCode.startsWith('S')) return 'swsh';
  if (setCode.startsWith('SM')) return 'sm';
  if (setCode.startsWith('XY')) return 'xy';
  if (setCode.startsWith('BW')) return 'bw';
  if (setCode.startsWith('neo')) return 'neo';
  if (setCode.startsWith('E')) return 'ecard';
  if (setCode.startsWith('PCG')) return 'dp';
  if (setCode.startsWith('PMCG')) return 'base';
  if (setCode === 'VS1') return 'base';
  if (setCode === 'web1') return 'base';
  return setCode.toLowerCase();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCORS();
  }

  // Require cron authentication
  const authResult = await requireCronAuth(req);
  if (!authResult.authorized) {
    console.warn(`Unauthorized access attempt to import-tcgdex-data: ${authResult.reason}`);
    return createUnauthorizedResponse(authResult.reason);
  }

  console.log(`Authenticated via: ${authResult.authType}`);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { language = 'en', limit = null, setIds = null } = await req.json().catch(() => ({}));
    
    console.log(`Starting TCGdex import for language: ${language}`);
    
    // Fetch all sets
    const setsResponse = await fetch(`https://api.tcgdex.net/v2/${language}/sets`);
    const allSets = await setsResponse.json();
    
    let setsToProcess = allSets;
    if (setIds && Array.isArray(setIds)) {
      setsToProcess = allSets.filter((s: any) => setIds.includes(s.id));
    }
    if (limit) {
      setsToProcess = setsToProcess.slice(0, limit);
    }
    
    console.log(`Processing ${setsToProcess.length} sets...`);
    
    let totalImported = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    const processedSets: string[] = [];
    const erroredSets: string[] = [];
    
    for (const set of setsToProcess) {
      try {
        console.log(`Processing set: ${set.name} (${set.id})`);
        
        // Fetch full set details with all cards
        const setResponse = await fetch(`https://api.tcgdex.net/v2/${language}/sets/${set.id}`);
        const setData = await setResponse.json();
        
        if (!setData.cards || setData.cards.length === 0) {
          console.log(`No cards in set ${set.id}, skipping`);
          continue;
        }
        
        // Process cards in batches
        const batchSize = 50;
        for (let i = 0; i < setData.cards.length; i += batchSize) {
          const cardBatch = setData.cards.slice(i, i + batchSize);
          
          // Fetch detailed data for each card in batch
          const cardPromises = cardBatch.map(async (card: any) => {
            try {
              const cardResponse = await fetch(`https://api.tcgdex.net/v2/${language}/cards/${card.id}`);
              const cardData = await cardResponse.json();
              
              // Check if card already exists
              const { data: existing } = await supabase
                .from('pokemon_card_attributes')
                .select('id')
                .eq('card_id', `tcgdex_${language}_${cardData.id}`)
                .single();
              
              if (existing) {
                totalSkipped++;
                return null;
              }
              
              // Construct image URL if not provided by API
              const imageUrl = cardData.image || 
                `https://assets.tcgdex.net/${language}/${getSeriesFromSetCode(set.id)}/${set.id}/${cardData.localId}`;
              
              // Map TCGdex data to our schema
              const mappedCard = {
                card_id: `tcgdex_${language}_${cardData.id}`,
                name: cardData.name,
                set_name: setData.name,
                set_code: set.id,
                number: cardData.localId,
                rarity: cardData.rarity || null,
                types: cardData.types || null,
                supertype: cardData.category || null,
                subtypes: cardData.stage ? [cardData.stage] : null,
                artist: cardData.illustrator || null,
                images: {
                  small: imageUrl,
                  large: imageUrl,
                  tcgdex: imageUrl
                },
                tcgplayer_prices: cardData.pricing?.tcgplayer ? {
                  updated: cardData.pricing.tcgplayer.updated,
                  holofoil: cardData.pricing.tcgplayer.holofoil,
                  normal: cardData.pricing.tcgplayer.normal,
                  reverseHolofoil: cardData.pricing.tcgplayer.reverseHolofoil
                } : null,
                cardmarket_prices: cardData.pricing?.cardmarket ? {
                  updated: cardData.pricing.cardmarket.updated,
                  avg: cardData.pricing.cardmarket.avg,
                  low: cardData.pricing.cardmarket.low,
                  high: cardData.pricing.cardmarket.high,
                  trend: cardData.pricing.cardmarket.trend
                } : null,
                printed_total: setData.cardCount?.official || setData.cardCount?.total || null,
                sync_source: 'tcgdex',
                synced_at: new Date().toISOString(),
                last_price_update: cardData.pricing ? new Date().toISOString() : null,
                metadata: {
                  hp: cardData.hp,
                  evolveFrom: cardData.evolveFrom,
                  abilities: cardData.abilities,
                  attacks: cardData.attacks,
                  weaknesses: cardData.weaknesses,
                  resistances: cardData.resistances,
                  retreat: cardData.retreat,
                  dexId: cardData.dexId,
                  variants: cardData.variants,
                  variantsDetailed: cardData.variants_detailed,
                  legal: cardData.legal,
                  language: language,
                  setLogo: setData.logo,
                  tcgOnline: setData.tcgOnline,
                  releaseDate: setData.releaseDate,
                  category: cardData.category
                }
              };
              
              totalImported++;
              return mappedCard;
            } catch (err) {
              console.error(`Error processing card ${card.id}:`, err);
              totalErrors++;
              return null;
            }
          });
          
          const cards = (await Promise.all(cardPromises)).filter(c => c !== null);
          
          if (cards.length > 0) {
            const { error: insertError } = await supabase
              .from('pokemon_card_attributes')
              .insert(cards);
            
            if (insertError) {
              console.error(`Error inserting batch:`, insertError);
              totalErrors += cards.length;
            }
          }
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        processedSets.push(set.id);
        console.log(`Completed set ${set.id}: ${totalImported} imported so far`);
        
      } catch (err) {
        console.error(`Error processing set ${set.id}:`, err);
        erroredSets.push(set.id);
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        language,
        stats: {
          totalImported,
          totalSkipped,
          totalErrors,
          setsProcessed: processedSets.length,
          setsFailed: erroredSets.length
        },
        processedSets,
        erroredSets
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
    
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
