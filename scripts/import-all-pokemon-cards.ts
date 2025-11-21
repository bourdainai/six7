/**
 * Script to import all Pokemon cards from GitHub repository
 * 
 * This script calls the import-github-pokemon-data edge function
 * to import all Pokemon TCG cards from the official GitHub data repository.
 * 
 * Usage:
 * - Import all sets: await importAllCards()
 * - Import specific sets: await importAllCards(['base1', 'base2', 'sv4a'])
 */

import { supabase } from '../src/integrations/supabase/client';

export async function importAllCards(setIds?: string[]) {
  console.log('🚀 Starting Pokemon card import from GitHub...');
  console.log('📦 Repository: https://github.com/PokemonTCG/pokemon-tcg-data');
  
  if (setIds) {
    console.log(`🎯 Target sets: ${setIds.join(', ')}`);
  } else {
    console.log('🎯 Importing ALL sets');
  }

  try {
    const { data, error } = await supabase.functions.invoke('import-github-pokemon-data', {
      body: { 
        setIds,
        batchSize: 50 
      }
    });

    if (error) {
      console.error('❌ Error:', error);
      return { success: false, error };
    }

    console.log('\n✅ Import completed successfully!');
    console.log('📊 Results:', data);
    
    return data;
  } catch (err) {
    console.error('❌ Failed to import:', err);
    return { success: false, error: err };
  }
}

// Example: Import specific sets including SV4a
// importAllCards(['sv4a', 'sv01', 'sv02', 'sv03']);

// Example: Import everything
// importAllCards();
