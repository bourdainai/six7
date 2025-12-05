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

interface FieldCompletion {
  core: { total: number; complete: number };
  images: { total: number; complete: number };
  pricing: { total: number; complete: number };
  metadata: { total: number; complete: number };
  extended: { total: number; complete: number };
}

interface SetProgress {
  cards_total: number;
  cards_processed: number;
  cards_inserted: number;
  cards_updated: number;
  cards_skipped: number;
  cards_failed: number;
  fields_completion: {
    core: { processed: number; complete: number; missing: number };
    images: { processed: number; complete: number; missing: number };
    pricing: { processed: number; complete: number; missing: number };
    metadata: { processed: number; complete: number; missing: number };
    extended: { processed: number; complete: number; missing: number };
  };
}

// Check which fields have data for a card
function analyzeCardFields(card: GitHubCard): {
  core: boolean;
  images: boolean;
  pricing: boolean;
  metadata: boolean;
  extended: boolean;
  details: Record<string, boolean>;
} {
  const details: Record<string, boolean> = {
    // Core fields
    id: !!card.id,
    name: !!card.name,
    set_code: !!card.set?.id,
    number: !!card.number,
    
    // Images
    image_small: !!card.images?.small,
    image_large: !!card.images?.large,
    
    // Pricing
    tcgplayer_prices: !!(card.tcgplayer?.prices && Object.keys(card.tcgplayer.prices).length > 0),
    cardmarket_prices: !!(card.cardmarket?.prices && Object.keys(card.cardmarket.prices).length > 0),
    
    // Metadata
    hp: !!card.hp,
    types: !!(card.types && card.types.length > 0),
    subtypes: !!(card.subtypes && card.subtypes.length > 0),
    supertype: !!card.supertype,
    abilities: !!(card.abilities && card.abilities.length > 0),
    attacks: !!(card.attacks && card.attacks.length > 0),
    weaknesses: !!(card.weaknesses && card.weaknesses.length > 0),
    resistances: !!(card.resistances && card.resistances.length > 0),
    retreatCost: !!(card.retreatCost && card.retreatCost.length > 0),
    artist: !!card.artist,
    rarity: !!card.rarity,
    
    // Extended
    flavorText: !!card.flavorText,
    nationalPokedexNumbers: !!(card.nationalPokedexNumbers && card.nationalPokedexNumbers.length > 0),
    legalities: !!(card.legalities && Object.keys(card.legalities).length > 0),
    evolvesFrom: !!card.evolvesFrom,
  };

  return {
    core: details.id && details.name && details.set_code && details.number,
    images: details.image_small || details.image_large,
    pricing: details.tcgplayer_prices || details.cardmarket_prices,
    metadata: details.hp || details.types || details.abilities || details.attacks,
    extended: details.flavorText || details.legalities || details.nationalPokedexNumbers,
    details,
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

    const { setIds, batchSize = 50, jobId } = await req.json().catch(() => ({}));

    console.log('🚀 Starting Enterprise GitHub Pokemon data import...');
    
    // Fetch sets list
    const setsResponse = await fetch(`${GITHUB_BASE_URL}/sets/en.json`);
    const allSets = await setsResponse.json();
    
    // Filter sets if specific ones requested
    const setsToProcess = setIds 
      ? allSets.filter((s: any) => setIds.includes(s.id))
      : allSets;

    console.log(`📦 Will process ${setsToProcess.length} sets`);

    // Create or get job record
    let currentJobId = jobId;
    if (!currentJobId) {
      const { data: newJob, error: jobError } = await supabase
        .from('import_jobs')
        .insert({
          job_type: setIds?.length === 1 ? 'single_set' : 'bulk_import',
          status: 'running',
          sets_total: setsToProcess.length,
          sets_completed: 0,
          cards_total: setsToProcess.reduce((sum: number, s: any) => sum + (s.total || 0), 0),
          source: 'github',
          started_at: new Date().toISOString(),
          metadata: {
            requested_sets: setIds || 'all',
            batch_size: batchSize,
          }
        })
        .select('id')
        .single();

      if (jobError) {
        console.error('Failed to create job record:', jobError);
      } else {
        currentJobId = newJob?.id;
        console.log(`📋 Created job: ${currentJobId}`);
      }
    } else {
      // Update existing job to running
      await supabase
        .from('import_jobs')
        .update({ status: 'running', updated_at: new Date().toISOString() })
        .eq('id', currentJobId);
    }

    // Tracking variables
    let totalImported = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    const processedSets: string[] = [];
    const failedSets: string[] = [];
    
    // Field completion tracking
    const fieldsSummary: FieldCompletion = {
      core: { total: 0, complete: 0 },
      images: { total: 0, complete: 0 },
      pricing: { total: 0, complete: 0 },
      metadata: { total: 0, complete: 0 },
      extended: { total: 0, complete: 0 },
    };

    // Process each set
    for (let setIndex = 0; setIndex < setsToProcess.length; setIndex++) {
      const set = setsToProcess[setIndex];
      const setStartTime = Date.now();
      
      console.log(`\n📦 [${setIndex + 1}/${setsToProcess.length}] Processing: ${set.name} (${set.id})`);

      // Update job with current set
      if (currentJobId) {
        await supabase
          .from('import_jobs')
          .update({
            current_set_id: set.id,
            current_set_name: set.name,
            sets_completed: setIndex,
          })
          .eq('id', currentJobId);
      }

      // Create set progress record
      let setProgressId: string | null = null;
      if (currentJobId) {
        const { data: setProgress } = await supabase
          .from('import_set_progress')
          .upsert({
            job_id: currentJobId,
            set_id: set.id,
            set_name: set.name,
            status: 'running',
            started_at: new Date().toISOString(),
          }, { onConflict: 'job_id,set_id' })
          .select('id')
          .single();
        setProgressId = setProgress?.id || null;
      }

      // Initialize set-level tracking
      const setProgress: SetProgress = {
        cards_total: 0,
        cards_processed: 0,
        cards_inserted: 0,
        cards_updated: 0,
        cards_skipped: 0,
        cards_failed: 0,
        fields_completion: {
          core: { processed: 0, complete: 0, missing: 0 },
          images: { processed: 0, complete: 0, missing: 0 },
          pricing: { processed: 0, complete: 0, missing: 0 },
          metadata: { processed: 0, complete: 0, missing: 0 },
          extended: { processed: 0, complete: 0, missing: 0 },
        },
      };

      try {
        // Fetch cards for this set
        const cardsResponse = await fetch(`${GITHUB_BASE_URL}/cards/en/${set.id}.json`);
        if (!cardsResponse.ok) {
          console.error(`❌ Failed to fetch cards for set ${set.id}: ${cardsResponse.status}`);
          failedSets.push(set.id);
          
          // Log error
          if (currentJobId) {
            await supabase.from('import_logs').insert({
              job_id: currentJobId,
              set_id: set.id,
              set_name: set.name,
              action: 'error',
              reason: `Failed to fetch cards: HTTP ${cardsResponse.status}`,
            });
          }
          continue;
        }

        const cards: GitHubCard[] = await cardsResponse.json();
        setProgress.cards_total = cards.length;
        console.log(`   📄 Found ${cards.length} cards`);

        // Update set progress with total
        if (setProgressId) {
          await supabase
            .from('import_set_progress')
            .update({ cards_total: cards.length })
            .eq('id', setProgressId);
        }

        // Process cards in batches
        for (let i = 0; i < cards.length; i += batchSize) {
          const batch = cards.slice(i, i + batchSize);
          const batchLogs: any[] = [];
          
          const cardsToUpsert = batch.map((card: GitHubCard) => {
            // Analyze field completion
            const fieldAnalysis = analyzeCardFields(card);
            
            // Update field tracking
            fieldsSummary.core.total++;
            fieldsSummary.images.total++;
            fieldsSummary.pricing.total++;
            fieldsSummary.metadata.total++;
            fieldsSummary.extended.total++;
            
            if (fieldAnalysis.core) fieldsSummary.core.complete++;
            if (fieldAnalysis.images) fieldsSummary.images.complete++;
            if (fieldAnalysis.pricing) fieldsSummary.pricing.complete++;
            if (fieldAnalysis.metadata) fieldsSummary.metadata.complete++;
            if (fieldAnalysis.extended) fieldsSummary.extended.complete++;
            
            // Track set-level fields
            setProgress.fields_completion.core.processed++;
            setProgress.fields_completion.images.processed++;
            setProgress.fields_completion.pricing.processed++;
            setProgress.fields_completion.metadata.processed++;
            setProgress.fields_completion.extended.processed++;
            
            if (fieldAnalysis.core) setProgress.fields_completion.core.complete++;
            else setProgress.fields_completion.core.missing++;
            
            if (fieldAnalysis.images) setProgress.fields_completion.images.complete++;
            else setProgress.fields_completion.images.missing++;
            
            if (fieldAnalysis.pricing) setProgress.fields_completion.pricing.complete++;
            else setProgress.fields_completion.pricing.missing++;
            
            if (fieldAnalysis.metadata) setProgress.fields_completion.metadata.complete++;
            else setProgress.fields_completion.metadata.missing++;
            
            if (fieldAnalysis.extended) setProgress.fields_completion.extended.complete++;
            else setProgress.fields_completion.extended.missing++;

            // Prepare log entry
            if (currentJobId) {
              batchLogs.push({
                job_id: currentJobId,
                set_id: set.id,
                set_name: set.name,
                card_id: `github_${card.id}`,
                card_name: card.name,
                card_number: card.number,
                action: 'processed', // Will update after upsert
                fields_processed: {
                  core: fieldAnalysis.core,
                  images: fieldAnalysis.images,
                  pricing: fieldAnalysis.pricing,
                  metadata: fieldAnalysis.metadata,
                  extended: fieldAnalysis.extended,
                },
                field_details: fieldAnalysis.details,
              });
            }

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

          // Upsert cards
          const { error: upsertError } = await supabase
            .from('pokemon_card_attributes')
            .upsert(cardsToUpsert, { 
              onConflict: 'card_id',
              ignoreDuplicates: false
            });

          if (upsertError) {
            console.error(`   ❌ Upsert error:`, upsertError.message);
            totalErrors += batch.length;
            setProgress.cards_failed += batch.length;
            
            // Update logs to show error
            batchLogs.forEach(log => {
              log.action = 'error';
              log.reason = upsertError.message;
            });
          } else {
            totalImported += batch.length;
            setProgress.cards_processed += batch.length;
            setProgress.cards_inserted += batch.length;
            
            // Update logs to show success
            batchLogs.forEach(log => {
              log.action = 'inserted';
            });
            
            console.log(`   ✅ Batch ${Math.ceil((i + 1) / batchSize)}/${Math.ceil(cards.length / batchSize)}: ${batch.length} cards processed`);
          }

          // Insert logs (sample every 10th card to avoid too many logs)
          if (currentJobId && batchLogs.length > 0) {
            const sampledLogs = batchLogs.filter((_, idx) => idx % 10 === 0 || idx === batchLogs.length - 1);
            await supabase.from('import_logs').insert(sampledLogs).catch(() => {});
          }

          // Update job progress periodically
          if (currentJobId && i % 100 === 0) {
            await supabase
              .from('import_jobs')
              .update({
                cards_imported: totalImported,
                cards_updated: totalUpdated,
                cards_failed: totalErrors,
                current_card_id: cardsToUpsert[cardsToUpsert.length - 1]?.card_id,
                current_card_name: cardsToUpsert[cardsToUpsert.length - 1]?.name,
                fields_summary: fieldsSummary,
              })
              .eq('id', currentJobId);
          }

          // Small delay between batches
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        // Update set progress to completed
        const setDuration = Date.now() - setStartTime;
        if (setProgressId) {
          await supabase
            .from('import_set_progress')
            .update({
              status: 'completed',
              cards_processed: setProgress.cards_processed,
              cards_inserted: setProgress.cards_inserted,
              cards_updated: setProgress.cards_updated,
              cards_skipped: setProgress.cards_skipped,
              cards_failed: setProgress.cards_failed,
              fields_completion: setProgress.fields_completion,
              completed_at: new Date().toISOString(),
              duration_ms: setDuration,
            })
            .eq('id', setProgressId);
        }

        processedSets.push(set.id);
        console.log(`   ✅ Set complete: ${setProgress.cards_processed} cards in ${setDuration}ms`);
        console.log(`   📊 Fields: Core=${setProgress.fields_completion.core.complete}/${setProgress.fields_completion.core.processed}, Images=${setProgress.fields_completion.images.complete}/${setProgress.fields_completion.images.processed}, Pricing=${setProgress.fields_completion.pricing.complete}/${setProgress.fields_completion.pricing.processed}`);

      } catch (err) {
        console.error(`   ❌ Error processing set ${set.id}:`, err);
        failedSets.push(set.id);
        totalErrors++;
        
        if (setProgressId) {
          await supabase
            .from('import_set_progress')
            .update({
              status: 'failed',
              errors: [{ message: err instanceof Error ? err.message : 'Unknown error', timestamp: new Date().toISOString() }],
            })
            .eq('id', setProgressId);
        }
      }
    }

    // Calculate final stats
    const totalDuration = Date.now() - startTime;
    const avgCardsPerSecond = totalImported / (totalDuration / 1000);

    // Update job as completed
    if (currentJobId) {
      await supabase
        .from('import_jobs')
        .update({
          status: 'completed',
          sets_completed: processedSets.length,
          sets_failed: failedSets.length,
          cards_imported: totalImported,
          cards_updated: totalUpdated,
          cards_skipped: totalSkipped,
          cards_failed: totalErrors,
          current_set_id: null,
          current_set_name: null,
          current_card_id: null,
          current_card_name: null,
          fields_summary: fieldsSummary,
          completed_at: new Date().toISOString(),
          avg_cards_per_second: avgCardsPerSecond,
        })
        .eq('id', currentJobId);
    }

    console.log(`\n🎉 Import Complete!`);
    console.log(`📊 Stats: ${totalImported} imported, ${totalUpdated} updated, ${totalSkipped} skipped, ${totalErrors} errors`);
    console.log(`⏱️  Duration: ${totalDuration}ms (${avgCardsPerSecond.toFixed(1)} cards/sec)`);
    console.log(`📋 Field Completion:`);
    console.log(`   Core: ${fieldsSummary.core.complete}/${fieldsSummary.core.total} (${((fieldsSummary.core.complete/fieldsSummary.core.total)*100).toFixed(1)}%)`);
    console.log(`   Images: ${fieldsSummary.images.complete}/${fieldsSummary.images.total} (${((fieldsSummary.images.complete/fieldsSummary.images.total)*100).toFixed(1)}%)`);
    console.log(`   Pricing: ${fieldsSummary.pricing.complete}/${fieldsSummary.pricing.total} (${((fieldsSummary.pricing.complete/fieldsSummary.pricing.total)*100).toFixed(1)}%)`);
    console.log(`   Metadata: ${fieldsSummary.metadata.complete}/${fieldsSummary.metadata.total} (${((fieldsSummary.metadata.complete/fieldsSummary.metadata.total)*100).toFixed(1)}%)`);
    console.log(`   Extended: ${fieldsSummary.extended.complete}/${fieldsSummary.extended.total} (${((fieldsSummary.extended.complete/fieldsSummary.extended.total)*100).toFixed(1)}%)`);

    return new Response(
      JSON.stringify({
        success: true,
        jobId: currentJobId,
        stats: {
          totalImported,
          totalUpdated,
          totalSkipped,
          totalErrors,
          setsProcessed: processedSets.length,
          processedSets,
          failedSets,
          durationMs: totalDuration,
          avgCardsPerSecond,
        },
        fieldsSummary,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
    
  } catch (error) {
    console.error('💥 Fatal Error:', error);
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
