/**
 * Enterprise-grade orchestration script for restoring Japanese TCGdex cards
 * 
 * Features:
 * - Identifies missing set codes from database
 * - Sequential imports with progress tracking
 * - Resumable (checks progress table)
 * - Comprehensive error handling and reporting
 * - Detailed logging and metrics
 */

import { supabase } from '../src/integrations/supabase/client';

interface SetToImport {
  setCode: string;
  existingCards: number;
  status: string;
}

interface ImportResult {
  setCode: string;
  success: boolean;
  cardsImported: number;
  error?: string;
  duration: number;
}

/**
 * Get all unique Japanese set codes from the database
 */
async function getJapaneseSetCodes(): Promise<SetToImport[]> {
  console.log('🔍 Identifying Japanese sets from database...\n');
  
  // Get all unique set codes from TCGdex cards
  const { data: sets, error } = await supabase
    .from('pokemon_card_attributes')
    .select('set_code')
    .eq('sync_source', 'tcgdex')
    .not('set_code', 'is', null);

  if (error) {
    console.error('❌ Error fetching set codes:', error);
    throw error;
  }

  // Get unique set codes and count existing cards
  const uniqueSets = [...new Set(sets?.map(s => s.set_code).filter(Boolean))];
  
  console.log(`📦 Found ${uniqueSets.length} unique sets in database\n`);

  // Check import progress for each set
  const setsWithStatus: SetToImport[] = [];
  
  for (const setCode of uniqueSets) {
    // Count existing cards for this set
    const { count } = await supabase
      .from('pokemon_card_attributes')
      .select('*', { count: 'exact', head: true })
      .eq('set_code', setCode)
      .eq('sync_source', 'tcgdex');

    // Check progress table
    const { data: progress } = await supabase
      .from('tcgdex_import_progress')
      .select('status')
      .eq('set_code', setCode)
      .eq('language', 'ja')
      .maybeSingle();

    setsWithStatus.push({
      setCode,
      existingCards: count || 0,
      status: progress?.status || 'pending'
    });
  }

  return setsWithStatus;
}

/**
 * Import a single set
 */
async function importSet(setCode: string): Promise<ImportResult> {
  const startTime = Date.now();
  
  console.log(`\n📦 Importing set: ${setCode}`);
  console.log(`⏱️  Started at: ${new Date().toISOString()}\n`);

  try {
    const { data, error } = await supabase.functions.invoke('import-tcgdex-set', {
      body: {
        setCode,
        language: 'ja'
      }
    });

    const duration = Date.now() - startTime;

    if (error) {
      console.error(`❌ Import failed for ${setCode}:`, error);
      return {
        setCode,
        success: false,
        cardsImported: 0,
        error: error.message,
        duration
      };
    }

    console.log(`✅ Import completed for ${setCode}`);
    console.log(`📊 Stats: ${data.stats.imported} cards imported in ${(duration / 1000).toFixed(1)}s`);

    return {
      setCode,
      success: true,
      cardsImported: data.stats.imported,
      duration
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Exception during import of ${setCode}:`, error);
    
    return {
      setCode,
      success: false,
      cardsImported: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration
    };
  }
}

/**
 * Main orchestration function
 */
async function restoreJapaneseCards() {
  console.log('🚀 Starting Japanese TCGdex Card Restoration\n');
  console.log('═'.repeat(60));
  console.log('\n');

  try {
    // Step 1: Identify sets to import
    const setsToImport = await getJapaneseSetCodes();
    
    // Filter sets that need importing (not completed)
    const pendingSets = setsToImport.filter(s => s.status !== 'completed');
    const completedSets = setsToImport.filter(s => s.status === 'completed');

    console.log('📊 Import Status Summary:');
    console.log(`   ✅ Completed: ${completedSets.length} sets`);
    console.log(`   ⏳ Pending: ${pendingSets.length} sets`);
    console.log('\n');

    if (pendingSets.length === 0) {
      console.log('🎉 All sets already imported! Nothing to do.');
      return;
    }

    console.log('📋 Sets to import:');
    pendingSets.forEach((set, idx) => {
      console.log(`   ${idx + 1}. ${set.setCode} (${set.existingCards} existing cards, status: ${set.status})`);
    });
    console.log('\n');

    // Step 2: Import each set sequentially
    const results: ImportResult[] = [];
    let totalCardsImported = 0;
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < pendingSets.length; i++) {
      const set = pendingSets[i];
      
      console.log('─'.repeat(60));
      console.log(`Progress: [${i + 1}/${pendingSets.length}]`);
      
      const result = await importSet(set.setCode);
      results.push(result);

      if (result.success) {
        successCount++;
        totalCardsImported += result.cardsImported;
      } else {
        failCount++;
      }

      // Brief pause between sets to avoid overwhelming the system
      if (i < pendingSets.length - 1) {
        console.log('\n⏸️  Pausing 2s before next set...\n');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Step 3: Final summary
    console.log('\n');
    console.log('═'.repeat(60));
    console.log('🎉 RESTORATION COMPLETE\n');
    console.log('📊 Final Statistics:');
    console.log(`   Total Sets Processed: ${results.length}`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   📥 Total Cards Imported: ${totalCardsImported}`);
    console.log('\n');

    if (failCount > 0) {
      console.log('❌ Failed Sets:');
      results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`   ${r.setCode}: ${r.error}`);
        });
      console.log('\n');
    }

    // Step 4: Verify database state
    console.log('🔍 Verifying final database state...\n');
    
    const { count: totalJapaneseCards } = await supabase
      .from('pokemon_card_attributes')
      .select('*', { count: 'exact', head: true })
      .eq('sync_source', 'tcgdex');

    const { data: sampleCards } = await supabase
      .from('pokemon_card_attributes')
      .select('name, set_code, set_name')
      .eq('sync_source', 'tcgdex')
      .limit(5);

    console.log(`✅ Total TCGdex cards in database: ${totalJapaneseCards}`);
    console.log('\n📝 Sample cards:');
    sampleCards?.forEach(card => {
      console.log(`   ${card.name} (${card.set_code}) - ${card.set_name}`);
    });

    console.log('\n');
    console.log('═'.repeat(60));
    console.log('✨ Script completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Fatal error during restoration:', error);
    throw error;
  }
}

// Run the script
console.log('\n');
restoreJapaneseCards()
  .then(() => {
    console.log('✅ Restoration process finished.');
    Deno.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Restoration process failed:', error);
    Deno.exit(1);
  });
