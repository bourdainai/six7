/**
 * MASTER IMPORT SCRIPT - Import ALL Pokemon Cards from ALL Sources
 * 
 * This orchestrates importing from:
 * - TCGdex GitHub (most complete)
 * - TCGdex API (backup)
 * - JustTCG (prices + Japanese cards)
 * 
 * Usage: Run this to get EVERYTHING
 */

import { supabase } from '../src/integrations/supabase/client';

export async function importEverything() {
  console.log('🚀 MASTER IMPORT STARTING...');
  console.log('📦 This will import ALL Pokemon cards from ALL sets');
  console.log('⏱️  This may take several minutes...\n');

  try {
    // Step 1: Import all priority sets
    console.log('STEP 1: Importing priority sets (SV series + popular sets)...');
    const { data: importData, error: importError } = await supabase.functions.invoke(
      'import-all-pokemon',
      {
        body: { mode: 'all' }
      }
    );

    if (importError) {
      console.error('❌ Import error:', importError);
      return { success: false, error: importError };
    }

    console.log('\n✅ STEP 1 COMPLETE!');
    console.log('📊 Results:', importData);

    // Step 2: Get current database stats
    console.log('\nSTEP 2: Checking database stats...');
    const { data: stats, error: statsError } = await supabase
      .from('pokemon_card_attributes')
      .select('set_code, set_name, sync_source', { count: 'exact' });

    if (!statsError && stats) {
      const setGroups = stats.reduce((acc: any, card: any) => {
        const key = `${card.set_code}_${card.sync_source}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

      console.log('\n📈 Current Database Stats:');
      Object.entries(setGroups).forEach(([key, count]) => {
        const [setCode, source] = key.split('_');
        console.log(`  ${setCode} (${source}): ${count} cards`);
      });

      const totalCards = stats.length;
      console.log(`\n✅ Total cards in database: ${totalCards}`);
    }

    // Step 3: Check for the specific cards user wanted
    console.log('\nSTEP 3: Verifying user-requested cards...');
    const { data: sv4aCards } = await supabase
      .from('pokemon_card_attributes')
      .select('card_id, name, display_number, set_code, set_name')
      .or('display_number.eq.143/190,display_number.eq.151/190,display_number.eq.167/190')
      .ilike('set_name', '%shiny%treasure%');

    if (sv4aCards && sv4aCards.length > 0) {
      console.log('✅ Found user-requested cards:');
      sv4aCards.forEach(card => {
        console.log(`  - ${card.name} (${card.display_number}) from ${card.set_name}`);
      });
    } else {
      console.log('⚠️  User-requested cards (143/190, 151/190, 167/190) not found yet');
      console.log('   These may need manual import or different source');
    }

    const finalResults = {
      success: true,
      importData,
      totalCards: stats?.length || 0,
      sv4aCardsFound: sv4aCards?.length || 0,
      timestamp: new Date().toISOString()
    };

    console.log('\n🎉 MASTER IMPORT COMPLETE!');
    return finalResults;

  } catch (err) {
    console.error('❌ Master import failed:', err);
    return { success: false, error: err };
  }
}

// Run it
// importEverything();
