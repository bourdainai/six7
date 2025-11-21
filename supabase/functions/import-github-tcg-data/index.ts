import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GITHUB_RAW_BASE = "https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting GitHub import...');

    const { setCode, batchSize = 100, maxSets = 10 } = await req.json().catch(() => ({}));

    // Step 1: Fetch all sets from GitHub
    console.log('Fetching sets list from GitHub...');
    const setsUrl = `${GITHUB_RAW_BASE}/sets/en.json`;
    const setsResponse = await fetch(setsUrl);
    
    if (!setsResponse.ok) {
      throw new Error(`Failed to fetch sets list: ${setsResponse.status}`);
    }

    const allSets = await setsResponse.json();
    console.log(`Found ${allSets.length} total sets in repository`);

    // Step 2: Filter sets to process
    let setsToProcess = allSets;
    if (setCode) {
      setsToProcess = allSets.filter((s: any) => s.id === setCode);
      console.log(`Filtering for single set: ${setCode}`);
    } else {
      // Limit to maxSets per run to avoid timeouts
      // Get sets that haven't been synced yet from GitHub
      const { data: syncedSets } = await supabase
        .from('tcg_sync_progress')
        .select('set_code')
        .eq('sync_source', 'github')
        .eq('sync_status', 'completed');

      const syncedSetIds = new Set(syncedSets?.map(s => s.set_code) || []);
      const unsyncedSets = allSets.filter((s: any) => !syncedSetIds.has(s.id));
      
      setsToProcess = unsyncedSets.slice(0, maxSets);
      console.log(`Processing ${setsToProcess.length} unsynced sets (max: ${maxSets}, total unsynced: ${unsyncedSets.length})`);
    }

    let totalImported = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    const failedSets: string[] = [];
    const successSets: string[] = [];

    // Step 3: Process each set
    for (const set of setsToProcess) {
      try {
        const setId = set.id;
        const setName = set.name;
        const totalCards = set.total || 0;

        console.log(`\n=== Processing Set: ${setName} (${setId}) - ${totalCards} cards ===`);

        // Check if already synced from GitHub
        const { data: existingProgress } = await supabase
          .from('tcg_sync_progress')
          .select('*')
          .eq('set_code', setId)
          .eq('sync_source', 'github')
          .single();

        if (existingProgress?.sync_status === 'completed') {
          console.log(`Set ${setId} already fully synced from GitHub, skipping...`);
          totalSkipped += totalCards;
          continue;
        }

        // Fetch the full set JSON which contains all cards
        const setDataUrl = `${GITHUB_RAW_BASE}/cards/en/${setId}.json`;
        console.log(`Fetching cards from: ${setDataUrl}`);
        
        const setDataResponse = await fetch(setDataUrl);
        
        if (!setDataResponse.ok) {
          console.error(`Failed to fetch set ${setId}: ${setDataResponse.status}`);
          failedSets.push(setId);
          continue;
        }

        const cards = await setDataResponse.json();
        console.log(`Found ${cards.length} cards in set ${setId}`);

        // Check which cards already exist
        const cardIds = cards.map((card: any) => card.id);
        const { data: existingCards } = await supabase
          .from('pokemon_card_attributes')
          .select('card_id')
          .in('card_id', cardIds);

        const existingCardIds = new Set(existingCards?.map(c => c.card_id) || []);
        const newCards = cards.filter((card: any) => !existingCardIds.has(card.id));
        
        console.log(`${newCards.length} new cards to import, ${existingCardIds.size} already exist`);
        totalSkipped += existingCardIds.size;

        // Process cards in batches
        let importedForSet = 0;
        for (let i = 0; i < newCards.length; i += batchSize) {
          const batch = newCards.slice(i, i + batchSize);
          
          const cardsToInsert = batch.map((card: any) => {
            // Map ALL GitHub data to our schema
            const mappedCard: any = {
              card_id: card.id,
              name: card.name,
              set_code: setId,
              set_name: setName,
              number: card.number,
              supertype: card.supertype,
              subtypes: card.subtypes || [],
              types: card.types || [],
              rarity: card.rarity,
              artist: card.artist,
              sync_source: 'github',
              synced_at: new Date().toISOString(),
            };

            // Images
            if (card.images) {
              mappedCard.images = {
                small: card.images.small,
                large: card.images.large
              };
            }

            // TCGPlayer data
            if (card.tcgplayer) {
              mappedCard.tcgplayer_id = card.tcgplayer.url?.split('/').pop() || null;
              if (card.tcgplayer.prices) {
                mappedCard.tcgplayer_prices = card.tcgplayer.prices;
                mappedCard.last_price_update = new Date().toISOString();
              }
            }

            // Cardmarket data
            if (card.cardmarket) {
              mappedCard.cardmarket_id = card.cardmarket.url?.split('/').pop() || null;
              if (card.cardmarket.prices) {
                mappedCard.cardmarket_prices = card.cardmarket.prices;
                mappedCard.last_price_update = new Date().toISOString();
              }
            }

            return mappedCard;
          });

          const { error: insertError, count } = await supabase
            .from('pokemon_card_attributes')
            .upsert(cardsToInsert, {
              onConflict: 'card_id',
              ignoreDuplicates: false
            });

          if (insertError) {
            console.error(`Error inserting batch for set ${setId}:`, insertError);
            totalErrors += batch.length;
          } else {
            importedForSet += batch.length;
            totalImported += batch.length;
            console.log(`Imported batch ${i / batchSize + 1}: ${batch.length} cards`);
          }
        }

        // Update sync progress
        await supabase
          .from('tcg_sync_progress')
          .upsert({
            set_code: setId,
            set_name: setName,
            sync_source: 'github',
            sync_status: 'completed',
            total_cards: totalCards,
            cards_synced: importedForSet,
            last_sync_at: new Date().toISOString(),
          }, {
            onConflict: 'set_code,sync_source'
          });

        successSets.push(setId);
        console.log(`✅ Completed set ${setId}: ${importedForSet} cards imported`);
        
      } catch (setError) {
        console.error(`Error processing set ${set.id}:`, setError);
        failedSets.push(set.id);
        totalErrors++;
      }
    }

    const result = {
      success: true,
      message: `GitHub import completed`,
      stats: {
        setsProcessed: successSets.length,
        setsAttempted: setsToProcess.length,
        totalSetsAvailable: allSets.length,
        totalImported,
        totalSkipped,
        totalErrors,
        successSets: successSets.slice(0, 10), // First 10
        failedSets: failedSets.length > 0 ? failedSets.slice(0, 10) : undefined
      }
    };

    console.log('\n=== IMPORT SUMMARY ===');
    console.log(`Sets processed: ${result.stats.setsProcessed}/${result.stats.setsAttempted}`);
    console.log(`Cards imported: ${totalImported}`);
    console.log(`Cards skipped: ${totalSkipped}`);
    console.log(`Errors: ${totalErrors}`);

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Import error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('Error stack:', errorStack);
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        stack: errorStack,
        details: 'Failed to import cards from GitHub'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
