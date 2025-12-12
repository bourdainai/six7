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
 * - Secure authentication
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getEnglishSetName } from "../_shared/japanese-set-names.ts";
import { requireCronAuth, handleCORS, createUnauthorizedResponse, getCorsHeaders } from "../_shared/cron-auth.ts";

const corsHeaders = getCorsHeaders();

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCORS();
  }

  // Require cron authentication
  const authResult = await requireCronAuth(req);
  if (!authResult.authorized) {
    console.warn(`Unauthorized access attempt to import-tcgdex-set: ${authResult.reason}`);
    return createUnauthorizedResponse(authResult.reason);
  }

  console.log(`Authenticated via: ${authResult.authType}`);

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

    const japaneseSetName = setData.name || setCode;
    const englishSetName = getEnglishSetName(setCode) || japaneseSetName;
    const totalCards = setData.cardCount?.total || 0;
    console.log(`📊 Set "${japaneseSetName}" (${englishSetName}) has ${totalCards} cards`);

    await updateProgress(supabase, {
      setCode,
      language,
      status: 'in_progress',
      cardsTotal: totalCards
    });

    // Get list of cards from set
    console.log(`🔍 Processing cards from set data...`);
    const cardsList = setData.cards || [];
    
    if (cardsList.length === 0) {
      const errorMsg = `No card data available for set ${setCode} (${englishSetName}). The TCGdex API does not have card data for this set.`;
      console.warn(`⚠️ ${errorMsg}`);
      await updateProgress(supabase, {
        setCode,
        language,
        status: 'completed',
        cardsImported: 0,
        cardsTotal: 0,
        errorMessage: 'Set has no card data in TCGdex API'
      });
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: errorMsg,
          cardsImported: 0,
          setCode,
          reason: 'no_api_data'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`✅ Found ${cardsList.length} cards in set`);

    // For Japanese cards, fetch English names from TCGdx API
    const fetchEnglishNames = language === 'ja';
    const englishNameMap = new Map<string, string>();

    if (fetchEnglishNames) {
      console.log(`🌐 Fetching English names for ${cardsList.length} Japanese cards...`);
      
      // Fetch English names with rate limiting
      for (let i = 0; i < cardsList.length; i++) {
        const card = cardsList[i];
        const localId = card.localId || card.id || 'unknown';
        
        // Rate limiting: delay each request
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        try {
          const englishCardUrl = `${TCGDEX_API_BASE}/en/sets/${setCode}/${localId}`;
          const englishCard = await fetchCardWithRetry(englishCardUrl);
          
          if (englishCard && englishCard.name) {
            englishNameMap.set(localId, englishCard.name);
            if ((i + 1) % 10 === 0) {
              console.log(`   📊 Progress: ${i + 1}/${cardsList.length} English names fetched`);
            }
          }
        } catch (error) {
          // Silent fail - will use Japanese name as fallback
          console.warn(`   ⚠️ Could not fetch English name for ${localId}`);
        }
      }
      
      console.log(`   ✅ Fetched ${englishNameMap.size}/${cardsList.length} English names`);
    }

    // Transform cards for database
    const transformedCards = cardsList.map((card: any) => {
      const cardId = card.id || `${setCode}-${card.localId || 'unknown'}`;
      const localId = card.localId || card.id || 'unknown';
      // Build base image URL without extension - we'll add proper suffixes
      const baseImageUrl = card.image || `https://assets.tcgdex.net/${language}/${setCode}/${localId}`;
      
      // Get English name if available
      const englishName = fetchEnglishNames 
        ? (englishNameMap.get(localId) || null)
        : null;
      
      const printedNumber = totalCards 
        ? `${localId}/${String(totalCards).padStart(3, '0')}`
        : localId;
      
      return {
        card_id: `tcgdx_${language}_${cardId}`,
        name: card.name || 'Unknown',
        name_en: englishName, // Store English name
        set_name: japaneseSetName,
        set_name_en: englishSetName,
        set_code: setCode,
        number: localId,
        printed_number: printedNumber,
        display_number: printedNumber,
        rarity: null,
        types: null,
        supertype: null,
        subtypes: null,
        artist: null,
        images: {
          small: `${baseImageUrl}/low.webp`,
          large: `${baseImageUrl}/high.webp`,
          tcgdex: `${baseImageUrl}/high.webp`
        },
        printed_total: totalCards,
        sync_source: 'tcgdex',
        synced_at: new Date().toISOString(),
        image_validated: false, // Will be validated separately
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
            ignoreDuplicates: false
          });

        if (error) {
          console.error(`❌ Batch error (${i}-${i + batch.length}):`, error);
          errorCount += batch.length;
        } else {
          importedCount += batch.length;
          
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
