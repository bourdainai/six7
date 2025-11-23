/**
 * Script to re-import TCGdex cards with English names
 * 
 * This script:
 * 1. Finds all unique set codes from TCGdex imports
 * 2. Deletes all existing TCGdex cards
 * 3. Re-imports them with language: 'en'
 */

import { supabase } from '../src/integrations/supabase/client';

async function reimportTCGdexEnglish() {
  console.log('🔍 Finding TCGdex sets to re-import...');
  
  // Step 1: Get all unique set codes from TCGdex
  const { data: sets, error: setsError } = await supabase
    .from('pokemon_card_attributes')
    .select('set_code')
    .eq('sync_source', 'tcgdex')
    .not('set_code', 'is', null);

  if (setsError) {
    console.error('❌ Error fetching sets:', setsError);
    return;
  }

  const uniqueSetCodes = [...new Set(sets?.map(s => s.set_code).filter(Boolean))];
  console.log(`📦 Found ${uniqueSetCodes.length} unique sets:`, uniqueSetCodes.join(', '));

  // Step 2: Delete all TCGdex cards
  console.log('\n🗑️  Deleting existing TCGdex cards...');
  const { error: deleteError } = await supabase
    .from('pokemon_card_attributes')
    .delete()
    .eq('sync_source', 'tcgdex');

  if (deleteError) {
    console.error('❌ Error deleting cards:', deleteError);
    return;
  }

  console.log('✅ Deleted all TCGdex cards');

  // Step 3: Re-import with English language
  console.log('\n🌍 Re-importing sets with English language...');
  console.log('📋 Sets to import:', uniqueSetCodes);
  
  const { data, error } = await supabase.functions.invoke('import-tcgdex-github', {
    body: {
      language: 'en',
      region: 'international',
      setIds: uniqueSetCodes,
      batchSize: 50
    }
  });

  if (error) {
    console.error('❌ Import error:', error);
    return;
  }

  console.log('\n✅ Re-import completed!');
  console.log('📊 Results:', data);
  
  if (data.setResults) {
    console.log('\n📈 Per-Set Results:');
    for (const [setId, result] of Object.entries(data.setResults)) {
      const r = result as any;
      console.log(`  ${setId}: ${r.imported} imported, ${r.skipped} skipped, ${r.errors} errors`);
    }
  }

  // Step 4: Verify the re-import
  console.log('\n🔍 Verifying English names...');
  const { data: sampleCards, error: verifyError } = await supabase
    .from('pokemon_card_attributes')
    .select('name, set_code, set_name')
    .eq('sync_source', 'tcgdex')
    .limit(10);

  if (verifyError) {
    console.error('❌ Verification error:', verifyError);
    return;
  }

  console.log('\n✅ Sample cards after re-import:');
  sampleCards?.forEach(card => {
    console.log(`  ${card.name} - ${card.set_name}`);
  });
}

// Run the script
console.log('🚀 Starting TCGdex English re-import...\n');
reimportTCGdexEnglish()
  .then(() => console.log('\n✨ Script completed!'))
  .catch(err => console.error('\n❌ Script failed:', err));
