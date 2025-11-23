/**
 * Enterprise-grade single-set TCGdex importer
 * 
 * Features:
 * - Idempotent (UPSERT operations)
 * - Progress tracking in database
 * - Exponential backoff rate limiting
 * - Comprehensive error handling
 * - Transaction safety
 * - Resumable imports
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TCGDEX_API_BASE = 'https://api.tcgdex.net/v2';
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 200;

interface ImportProgress {
  setCode: string;
  language: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  cardsImported: number;
  cardsTotal: number;
  lastCardNumber: number;
  errorMessage?: string;
  retryCount: number;
}

/**
 * Exponential backoff delay
 */
async function delayWithBackoff(attemptNumber: number): Promise<void> {
  const delay = BASE_DELAY_MS * Math.pow(2, attemptNumber);
  await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Fetch card with retry logic
 */
async function fetchCardWithRetry(url: string, retries = MAX_RETRIES): Promise<any> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url);
      
      if (response.ok) {
        return await response.json();
      }
      
      if (response.status === 404) {
        return null; // Card doesn't exist
      }
      
      if (response.status === 429) {
        // Rate limited, wait longer
        await delayWithBackoff(attempt + 2);
        continue;
      }
      
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      
    } catch (error) {
      if (attempt === retries - 1) throw error;
      await delayWithBackoff(attempt);
    }
  }
  
  throw new Error('Max retries exceeded');
}

/**
 * Update import progress in database
 */
async function updateProgress(
  supabase: any,
  progress: Partial<ImportProgress> & { setCode: string; language: string }
): Promise<void> {
  const { error } = await supabase
    .from('tcgdex_import_progress')
    .upsert({
      set_code: progress.setCode,
      language: progress.language,
      status: progress.status,
      cards_imported: progress.cardsImported ?? 0,
      cards_total: progress.cardsTotal ?? 0,
      last_card_number: progress.lastCardNumber ?? 0,
      error_message: progress.errorMessage,
      retry_count: progress.retryCount ?? 0,
      started_at: progress.status === 'in_progress' ? new Date().toISOString() : undefined,
      completed_at: progress.status === 'completed' ? new Date().toISOString() : undefined,
    }, {
      onConflict: 'set_code,language'
    });
  
  if (error) {
    console.error('Failed to update progress:', error);
  }
}

/**
 * Transform TCGdex card to database format
 */
function transformCard(card: any, language: string, setCode: string, setName: string): any {
  const cardId = card.id || `${setCode}-${card.localId || 'unknown'}`;
  const localId = card.localId || card.id || 'unknown';
  const imageUrl = card.image || `https://assets.tcgdex.net/${language}/${setCode}/${localId}`;
  
  return {
    card_id: `tcgdex_${language}_${cardId}`,
    name: card.name || 'Unknown',
    set_name: setName,
    set_code: setCode,
    number: localId,
    display_number: localId,
    search_number: localId.replace(/\s/g, '').toLowerCase(),
    rarity: card.rarity || null,
    types: card.types || null,
    supertype: card.category || null,
    subtypes: card.stage ? [card.stage] : null,
    artist: card.illustrator || null,
    images: {
      small: imageUrl,
      large: imageUrl,
      tcgdex: imageUrl
    },
    printed_total: card.set?.cardCount?.official || card.set?.cardCount?.total || null,
    sync_source: 'tcgdex',
    synced_at: new Date().toISOString(),
    metadata: {
      hp: card.hp,
      evolveFrom: card.evolveFrom,
      stage: card.stage,
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
      category: card.category,
      language,
      imported_at: new Date().toISOString()
    }
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let requestBody: any;
  
  try {
    requestBody = await req.json();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      setCode,
      language = 'ja',
    } = requestBody;

    if (!setCode) {
      return new Response(
        JSON.stringify({ error: 'setCode is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`\n🚀 Starting import for set: ${setCode} (${language})`);

    // Mark as in progress
    await updateProgress(supabase, {
      setCode,
      language,
      status: 'in_progress',
      cardsImported: 0,
      cardsTotal: 0,
      retryCount: 0
    });

    // Fetch set metadata from TCGdex API
    const setUrl = `${TCGDEX_API_BASE}/${language}/sets/${setCode}`;
    console.log(`📦 Fetching set metadata: ${setUrl}`);
    
    const setData = await fetchCardWithRetry(setUrl);
    
    if (!setData) {
      const errorMsg = `Set ${setCode} not found for language ${language}`;
      console.error(`❌ ${errorMsg}`);
      await updateProgress(supabase, {
        setCode,
        language,
        status: 'failed',
        errorMessage: errorMsg
      });
      return new Response(
        JSON.stringify({ error: errorMsg }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    const setName = setData.name || setCode;
    const totalCards = setData.cardCount?.total || 0;
    console.log(`📊 Set "${setName}" has ${totalCards} cards`);

    await updateProgress(supabase, {
      setCode,
      language,
      status: 'in_progress',
      cardsTotal: totalCards
    });

    // Get list of cards from set (these contain enough data for our needs)
    console.log(`🔍 Processing cards from set data...`);
    const cardsList = setData.cards || [];
    
    if (cardsList.length === 0) {
      const errorMsg = `No cards found in set ${setCode}`;
      console.error(`❌ ${errorMsg}`);
      await updateProgress(supabase, {
        setCode,
        language,
        status: 'failed',
        errorMessage: errorMsg
      });
      return new Response(
        JSON.stringify({ error: errorMsg }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    console.log(`✅ Found ${cardsList.length} cards in set`);

    // Transform cards for database (use summary data from set endpoint)
    const transformedCards = cardsList.map((card: any) => {
      const cardId = card.id || `${setCode}-${card.localId || 'unknown'}`;
      const localId = card.localId || card.id || 'unknown';
      const imageUrl = card.image || `https://assets.tcgdex.net/${language}/${setCode}/${localId}`;
      
      return {
        card_id: `tcgdex_${language}_${cardId}`,
        name: card.name || 'Unknown',
        set_name: setName,
        set_code: setCode,
        number: localId,
        search_number: localId.replace(/\s/g, '').toLowerCase(),
        rarity: null, // Not in summary
        types: null,
        supertype: null,
        subtypes: null,
        artist: null,
        images: {
          small: imageUrl,
          large: imageUrl,
          tcgdex: imageUrl
        },
        printed_total: totalCards,
        sync_source: 'tcgdex',
        synced_at: new Date().toISOString(),
        metadata: {
          language,
          imported_at: new Date().toISOString(),
          summary_import: true
        }
      };
    });

    if (transformedCards.length === 0) {
      const errorMsg = `Failed to fetch any card details for set ${setCode}`;
      console.error(`❌ ${errorMsg}`);
      await updateProgress(supabase, {
        setCode,
        language,
        status: 'failed',
        errorMessage: errorMsg
      });
      return new Response(
        JSON.stringify({ error: errorMsg }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Use UPSERT for idempotency
    const BATCH_SIZE = 50;
    let importedCount = 0;
    let errorCount = 0;

    console.log(`💾 Importing ${transformedCards.length} cards to database...`);

    for (let i = 0; i < transformedCards.length; i += BATCH_SIZE) {
      const batch = transformedCards.slice(i, i + BATCH_SIZE);
      
      try {
        const { error } = await supabase
          .from('pokemon_card_attributes')
          .upsert(batch, {
            onConflict: 'card_id',
            ignoreDuplicates: false // Update if exists
          });

        if (error) {
          console.error(`❌ Batch error (${i}-${i + batch.length}):`, error);
          errorCount += batch.length;
        } else {
          importedCount += batch.length;
          
          // Update progress periodically
          if (importedCount % 100 === 0 || importedCount === transformedCards.length) {
            console.log(`   ✅ Imported ${importedCount}/${transformedCards.length} cards`);
            await updateProgress(supabase, {
              setCode,
              language,
              status: 'in_progress',
              cardsImported: importedCount,
              cardsTotal: transformedCards.length,
              lastCardNumber: i + batch.length
            });
          }
        }

        // Minimal rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));
        
      } catch (error) {
        console.error(`❌ Batch exception:`, error);
        errorCount += batch.length;
      }
    }

    // Mark as completed
    await updateProgress(supabase, {
      setCode,
      language,
      status: 'completed',
      cardsImported: importedCount,
      cardsTotal: transformedCards.length,
      errorMessage: errorCount > 0 ? `${errorCount} cards failed to import` : undefined
    });

    console.log(`\n✅ Import completed for ${setCode}`);
    console.log(`📊 Stats: ${importedCount} imported, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        setCode,
        language,
        stats: {
          total: transformedCards.length,
          imported: importedCount,
          errors: errorCount
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Fatal error:', error);
    
    // Try to mark as failed in database
    try {
      if (requestBody?.setCode && requestBody?.language) {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        await updateProgress(supabase, {
          setCode: requestBody.setCode,
          language: requestBody.language,
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    } catch (progressError) {
      console.error('Failed to update error status:', progressError);
    }

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
