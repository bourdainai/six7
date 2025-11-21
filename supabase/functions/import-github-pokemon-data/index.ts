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

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { setIds, batchSize = 50 } = await req.json().catch(() => ({}));

    console.log('Starting GitHub Pokemon data import...');
    
    // Fetch sets list
    const setsResponse = await fetch(`${GITHUB_BASE_URL}/sets/en.json`);
    const allSets = await setsResponse.json();
    
    // Filter sets if specific ones requested
    const setsToProcess = setIds 
      ? allSets.filter((s: any) => setIds.includes(s.id))
      : allSets;

    console.log(`Processing ${setsToProcess.length} sets...`);

    let totalImported = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    const processedSets: string[] = [];
    const failedSets: string[] = [];

    for (const set of setsToProcess) {
      try {
        console.log(`\n📦 Processing set: ${set.name} (${set.id})`);
        
        // Fetch cards for this set
        const cardsResponse = await fetch(`${GITHUB_BASE_URL}/cards/en/${set.id}.json`);
        if (!cardsResponse.ok) {
          console.error(`Failed to fetch cards for set ${set.id}`);
          failedSets.push(set.id);
          continue;
        }

        const cards: GitHubCard[] = await cardsResponse.json();
        console.log(`Found ${cards.length} cards in ${set.name}`);

        // Check which cards already exist
        const cardIds = cards.map(c => `github_${c.id}`);
        const { data: existingCards } = await supabase
          .from('pokemon_card_attributes')
          .select('card_id')
          .in('card_id', cardIds);

        const existingCardIds = new Set(existingCards?.map(c => c.card_id) || []);
        const newCards = cards.filter(c => !existingCardIds.has(`github_${c.id}`));

        console.log(`${newCards.length} new cards to import, ${existingCards?.length || 0} already exist`);

        // Process cards in batches
        for (let i = 0; i < newCards.length; i += batchSize) {
          const batch = newCards.slice(i, i + batchSize);
          
          const cardsToInsert = batch.map(card => {
            return {
              card_id: `github_${card.id}`,
              name: card.name,
              set_name: set.name,
              set_code: set.id,
              number: card.number,
              rarity: card.rarity || null,
              types: card.types || null,
              supertype: card.supertype || null,
              subtypes: card.subtypes || null,
              artist: card.artist || null,
              images: {
                small: card.images.small,
                large: card.images.large,
                github: card.images.large
              },
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
              }
            };
          });

          const { error: insertError } = await supabase
            .from('pokemon_card_attributes')
            .insert(cardsToInsert);

          if (insertError) {
            console.error(`Error inserting batch:`, insertError);
            totalErrors += batch.length;
          } else {
            totalImported += batch.length;
            console.log(`✅ Imported batch of ${batch.length} cards (${totalImported} total)`);
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        totalSkipped += existingCards?.length || 0;
        processedSets.push(set.id);

      } catch (err) {
        console.error(`Error processing set ${set.id}:`, err);
        failedSets.push(set.id);
        totalErrors++;
      }
    }

    console.log(`\n✅ Import complete!`);
    console.log(`📊 Stats: ${totalImported} imported, ${totalSkipped} skipped, ${totalErrors} errors`);
    console.log(`✅ Processed sets: ${processedSets.join(', ')}`);
    if (failedSets.length > 0) {
      console.log(`❌ Failed sets: ${failedSets.join(', ')}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        stats: {
          totalImported,
          totalSkipped,
          totalErrors,
          setsProcessed: processedSets.length,
          processedSets,
          failedSets
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
    
  } catch (error) {
    console.error('Error:', error);
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
