import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GITHUB_BASE_URL = 'https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master';

interface GitHubCard {
  id: string;
  name: string;
  supertype: string;
  subtypes?: string[];
  hp?: string;
  types?: string[];
  evolvesFrom?: string;
  abilities?: any[];
  attacks?: any[];
  weaknesses?: any[];
  resistances?: any[];
  retreatCost?: string[];
  convertedRetreatCost?: number;
  set: {
    id: string;
    name: string;
    series: string;
    printedTotal: number;
    total: number;
    releaseDate: string;
  };
  number: string;
  artist?: string;
  rarity?: string;
  flavorText?: string;
  nationalPokedexNumbers?: number[];
  legalities?: any;
  images: {
    small: string;
    large: string;
  };
  tcgplayer?: {
    url: string;
    updatedAt: string;
    prices?: any;
  };
  cardmarket?: {
    url: string;
    updatedAt: string;
    prices?: any;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { setIds, batchSize = 25 } = await req.json().catch(() => ({}));

    console.log('🚀 Starting Pokemon data import...');
    console.log(`📋 Requested sets: ${setIds ? setIds.join(', ') : 'all'}`);
    
    // Fetch sets list
    const setsResponse = await fetch(`${GITHUB_BASE_URL}/sets/en.json`);
    if (!setsResponse.ok) {
      throw new Error(`Failed to fetch sets: ${setsResponse.status}`);
    }
    const allSets = await setsResponse.json();
    
    // Filter sets if specific ones requested
    const setsToProcess = setIds 
      ? allSets.filter((s: any) => setIds.includes(s.id))
      : allSets;

    console.log(`📦 Processing ${setsToProcess.length} set(s)`);

    // Tracking
    let totalImported = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    const processedSets: string[] = [];
    const failedSets: string[] = [];
    const cardResults: Array<{
      cardId: string;
      cardName: string;
      setId: string;
      action: string;
      fields: {
        hasCore: boolean;
        hasImages: boolean;
        hasPricing: boolean;
        hasMetadata: boolean;
      };
    }> = [];

    // Process each set
    for (const set of setsToProcess) {
      console.log(`\n📦 SET: ${set.name} (${set.id})`);
      
      try {
        // Fetch cards for this set
        const cardsUrl = `${GITHUB_BASE_URL}/cards/en/${set.id}.json`;
        console.log(`   Fetching: ${cardsUrl}`);
        
        const cardsResponse = await fetch(cardsUrl);
        if (!cardsResponse.ok) {
          console.error(`   ❌ Failed to fetch cards: HTTP ${cardsResponse.status}`);
          failedSets.push(set.id);
          totalErrors++;
          continue;
        }

        const cards: GitHubCard[] = await cardsResponse.json();
        console.log(`   📄 Found ${cards.length} cards to process`);

        let setImported = 0;
        let setUpdated = 0;
        let setSkipped = 0;
        let setErrors = 0;

        // Process cards in small batches for reliability
        for (let i = 0; i < cards.length; i += batchSize) {
          const batch = cards.slice(i, i + batchSize);
          const batchNum = Math.floor(i / batchSize) + 1;
          const totalBatches = Math.ceil(cards.length / batchSize);
          
          console.log(`   📝 Batch ${batchNum}/${totalBatches} (${batch.length} cards)`);

          const cardsToUpsert = batch.map((card: GitHubCard) => {
            // Track which fields have data
            const hasCore = !!(card.id && card.name && card.set?.id && card.number);
            const hasImages = !!(card.images?.small || card.images?.large);
            const hasPricing = !!(card.tcgplayer?.prices || card.cardmarket?.prices);
            const hasMetadata = !!(card.hp || card.types?.length || card.abilities?.length || card.attacks?.length);

            // Generate the printed number as it appears on the card (e.g., "125/094")
            const printedNumber = set.printedTotal 
              ? `${card.number}/${String(set.printedTotal).padStart(3, '0')}`
              : card.number;

            return {
              card_id: `github_${card.id}`,
              name: card.name,
              set_name: set.name,
              set_code: set.id,
              number: card.number,
              printed_number: printedNumber,
              display_number: printedNumber, // Also update display_number for consistency
              rarity: card.rarity || null,
              types: card.types || null,
              supertype: card.supertype || null,
              subtypes: card.subtypes || null,
              artist: card.artist || null,
              images: card.images ? {
                small: card.images.small,
                large: card.images.large,
                github: card.images.large
              } : null,
              tcgplayer_id: card.tcgplayer?.url || null,
              tcgplayer_prices: card.tcgplayer?.prices || null,
              cardmarket_id: card.cardmarket?.url || null,
              cardmarket_prices: card.cardmarket?.prices ? {
                updated: card.cardmarket.updatedAt,
                ...card.cardmarket.prices
              } : null,
              printed_total: set.printedTotal,
              sync_source: 'github',
              synced_at: new Date().toISOString(),
              last_price_update: (card.tcgplayer?.prices || card.cardmarket?.prices) 
                ? new Date().toISOString() 
                : null,
              metadata: {
                hp: card.hp,
                evolvesFrom: card.evolvesFrom,
                abilities: card.abilities,
                attacks: card.attacks,
                weaknesses: card.weaknesses,
                resistances: card.resistances,
                retreatCost: card.retreatCost,
                convertedRetreatCost: card.convertedRetreatCost,
                nationalPokedexNumbers: card.nationalPokedexNumbers,
                legalities: card.legalities,
                flavorText: card.flavorText,
                set_series: set.series,
                release_date: set.releaseDate
              },
              // Store field completion for verification
              _fields: { hasCore, hasImages, hasPricing, hasMetadata }
            };
          });

          // Upsert the batch
          const { error: upsertError } = await supabase
            .from('pokemon_card_attributes')
            .upsert(
              cardsToUpsert.map(({ _fields, ...card }) => card),
              { onConflict: 'card_id', ignoreDuplicates: false }
            );

          if (upsertError) {
            console.error(`   ❌ Batch error: ${upsertError.message}`);
            setErrors += batch.length;
            totalErrors += batch.length;
          } else {
            setImported += batch.length;
            totalImported += batch.length;
            
            // Log each card processed
            batch.forEach((card, idx) => {
              const cardData = cardsToUpsert[idx];
              cardResults.push({
                cardId: `github_${card.id}`,
                cardName: card.name,
                setId: set.id,
                action: 'imported',
                fields: cardData._fields
              });
              
              // Log individual card for visibility
              console.log(`      ✓ ${card.name} (#${card.number}) - Core:${cardData._fields.hasCore ? '✓' : '✗'} Img:${cardData._fields.hasImages ? '✓' : '✗'} Price:${cardData._fields.hasPricing ? '✓' : '✗'} Meta:${cardData._fields.hasMetadata ? '✓' : '✗'}`);
            });
          }

          // Small delay to prevent overwhelming the database
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Set complete
        console.log(`   ✅ Set complete: ${setImported} imported, ${setUpdated} updated, ${setSkipped} skipped, ${setErrors} errors`);
        processedSets.push(set.id);

      } catch (err) {
        console.error(`   ❌ Set error: ${err}`);
        failedSets.push(set.id);
        totalErrors++;
      }
    }

    // Final stats
    const duration = Date.now() - startTime;
    const cardsPerSecond = totalImported / (duration / 1000);

    console.log(`\n🎉 IMPORT COMPLETE`);
    console.log(`📊 Stats:`);
    console.log(`   Sets: ${processedSets.length} processed, ${failedSets.length} failed`);
    console.log(`   Cards: ${totalImported} imported, ${totalUpdated} updated, ${totalSkipped} skipped, ${totalErrors} errors`);
    console.log(`   Time: ${duration}ms (${cardsPerSecond.toFixed(1)} cards/sec)`);

    // Field completion summary
    const fieldStats = {
      core: cardResults.filter(c => c.fields.hasCore).length,
      images: cardResults.filter(c => c.fields.hasImages).length,
      pricing: cardResults.filter(c => c.fields.hasPricing).length,
      metadata: cardResults.filter(c => c.fields.hasMetadata).length,
      total: cardResults.length
    };

    console.log(`📋 Field Completion:`);
    console.log(`   Core: ${fieldStats.core}/${fieldStats.total} (${((fieldStats.core/fieldStats.total)*100).toFixed(1)}%)`);
    console.log(`   Images: ${fieldStats.images}/${fieldStats.total} (${((fieldStats.images/fieldStats.total)*100).toFixed(1)}%)`);
    console.log(`   Pricing: ${fieldStats.pricing}/${fieldStats.total} (${((fieldStats.pricing/fieldStats.total)*100).toFixed(1)}%)`);
    console.log(`   Metadata: ${fieldStats.metadata}/${fieldStats.total} (${((fieldStats.metadata/fieldStats.total)*100).toFixed(1)}%)`);

    return new Response(
      JSON.stringify({
        success: true,
        stats: {
          totalImported,
          totalUpdated,
          totalSkipped,
          totalErrors,
          setsProcessed: processedSets.length,
          setsFailed: failedSets.length,
          processedSets,
          failedSets,
          durationMs: duration,
          cardsPerSecond: Math.round(cardsPerSecond * 10) / 10,
        },
        fieldCompletion: fieldStats,
        // Return last 50 cards for display
        recentCards: cardResults.slice(-50),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
    
  } catch (error) {
    console.error('💥 FATAL ERROR:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
