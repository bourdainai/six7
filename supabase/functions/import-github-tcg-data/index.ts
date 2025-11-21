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

    const { setCode, batchSize = 500 } = await req.json().catch(() => ({}));

    console.log(`Starting GitHub import${setCode ? ` for set: ${setCode}` : ' for all sets'}`);

    // Fetch list of all sets from GitHub
    let setsToProcess: string[] = [];
    
    if (setCode) {
      setsToProcess = [setCode];
    } else {
      // Fetch the sets directory listing to get all set codes
      // We'll need to fetch a known index or use a predefined list
      // For now, let's use the popular_sets table as a starting point
      const { data: popularSets } = await supabase
        .from('popular_sets')
        .select('set_code')
        .eq('is_active', true);
      
      setsToProcess = popularSets?.map(s => s.set_code) || [];
      
      console.log(`Found ${setsToProcess.length} sets to process from popular_sets table`);
    }

    let totalImported = 0;
    let totalSkipped = 0;
    const failedSets: string[] = [];

    for (const setCodeToImport of setsToProcess) {
      try {
        console.log(`Processing set: ${setCodeToImport}`);
        
        // Fetch set data from GitHub - try different URL patterns
        let setUrl = `${GITHUB_RAW_BASE}/sets/en/${setCodeToImport}.json`;
        let setResponse = await fetch(setUrl);
        
        // If first URL fails, try without /en/
        if (!setResponse.ok) {
          setUrl = `${GITHUB_RAW_BASE}/sets/${setCodeToImport}.json`;
          setResponse = await fetch(setUrl);
        }
        
        if (!setResponse.ok) {
          console.error(`Failed to fetch set ${setCodeToImport}: ${setResponse.status} from ${setUrl}`);
          failedSets.push(setCodeToImport);
          continue;
        }

        const setData = await setResponse.json();
        const cards = setData.cards || [];
        
        console.log(`Found ${cards.length} cards in set ${setCodeToImport}`);

        // Check if set already has cards from github source
        const { data: existingCards, error: checkError } = await supabase
          .from('pokemon_card_attributes')
          .select('card_id')
          .eq('set_code', setCodeToImport)
          .eq('sync_source', 'github');

        if (checkError) {
          console.error(`Error checking existing cards: ${checkError.message}`);
        }

        const existingCardIds = new Set(existingCards?.map(c => c.card_id) || []);
        const newCards = cards.filter((card: any) => !existingCardIds.has(card.id));
        
        console.log(`${newCards.length} new cards to import, ${existingCardIds.size} already exist`);
        totalSkipped += existingCardIds.size;

        // Process cards in batches
        for (let i = 0; i < newCards.length; i += batchSize) {
          const batch = newCards.slice(i, i + batchSize);
          
          const cardsToInsert = batch.map((card: any) => ({
            card_id: card.id,
            name: card.name,
            set_code: setCodeToImport,
            set_name: setData.name || card.set?.name || '',
            number: card.number,
            supertype: card.supertype,
            subtypes: card.subtypes || [],
            types: card.types || [],
            rarity: card.rarity,
            artist: card.artist,
            images: {
              small: card.images?.small,
              large: card.images?.large
            },
            tcgplayer_id: card.tcgplayer?.productId?.toString(),
            cardmarket_id: card.cardmarket?.productId?.toString(),
            sync_source: 'github',
            synced_at: new Date().toISOString(),
          }));

          const { error: insertError } = await supabase
            .from('pokemon_card_attributes')
            .upsert(cardsToInsert, {
              onConflict: 'card_id',
              ignoreDuplicates: false
            });

          if (insertError) {
            console.error(`Error inserting batch for set ${setCodeToImport}:`, insertError);
          } else {
            totalImported += cardsToInsert.length;
            console.log(`Imported batch of ${cardsToInsert.length} cards`);
          }
        }

        // Update sync progress
        await supabase
          .from('tcg_sync_progress')
          .upsert({
            set_code: setCodeToImport,
            set_name: setData.name,
            sync_source: 'github',
            sync_status: 'completed',
            total_cards: cards.length,
            cards_synced: newCards.length,
            last_sync_at: new Date().toISOString(),
          }, {
            onConflict: 'set_code,sync_source'
          });

        console.log(`Completed set ${setCodeToImport}`);
        
      } catch (setError) {
        console.error(`Error processing set ${setCodeToImport}:`, setError);
        failedSets.push(setCodeToImport);
      }
    }

    const result = {
      success: true,
      message: `GitHub import completed`,
      stats: {
        setsProcessed: setsToProcess.length - failedSets.length,
        totalImported,
        totalSkipped,
        failedSets: failedSets.length > 0 ? failedSets : undefined
      }
    };

    console.log('Import result:', result);

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
