/**
 * Script to import Pokemon cards from JustTCG API
 * 
 * JustTCG has complete Japanese Pokemon data including sv4a Shiny Treasure ex (360 cards)
 * 
 * Usage examples:
 * - Import sv4a: await importJustTCG({ setIds: ['sv4a', 'shiny-treasure'] })
 * - Import all sets: await importJustTCG({})
 */

import { supabase } from '../src/integrations/supabase/client';

interface ImportOptions {
  setIds?: string[];
  game?: string;
  language?: string;
}

export async function importJustTCG(options: ImportOptions = {}) {
  const {
    setIds = null,
    game = 'pokemon',
    language = 'Japanese'
  } = options;

  console.log('🚀 Starting JustTCG import...');
  console.log(`📦 Source: JustTCG API (Complete Japanese Pokemon data)`);
  console.log(`🎮 Game: ${game}`);
  console.log(`🌍 Language: ${language}`);
  
  if (setIds) {
    console.log(`🎯 Target sets: ${setIds.join(', ')}`);
  } else {
    console.log('🎯 Importing all available sets');
  }

  try {
    const { data, error } = await supabase.functions.invoke('sync-justtcg-data', {
      body: { 
        setIds,
        game,
        language
      }
    });

    if (error) {
      console.error('❌ Error:', error);
      return { success: false, error };
    }

    console.log('\n✅ Import completed successfully!');
    console.log('📊 Results:', data);
    
    if (data.setResults) {
      console.log('\n📈 Per-Set Results:');
      for (const [setId, result] of Object.entries(data.setResults)) {
        console.log(`  ${setId}: ${(result as any).imported} imported, ${(result as any).skipped} skipped, ${(result as any).errors} errors`);
      }
    }
    
    return data;
  } catch (err) {
    console.error('❌ Failed to import:', err);
    return { success: false, error: err };
  }
}

// Example usage:

// Import sv4a Shiny Treasure ex (all 360 cards including 143/190, 151/190, 167/190)
// importJustTCG({ setIds: ['sv4a', 'shiny-treasure'] });

// Import all Japanese Pokemon sets
// importJustTCG({});
