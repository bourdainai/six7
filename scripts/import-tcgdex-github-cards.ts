/**
 * Script to import Pokemon cards from TCGdex GitHub repository
 * 
 * This script calls the import-tcgdex-github edge function to import
 * Pokemon TCG cards from the official TCGdex GitHub data repository.
 * 
 * Usage examples:
 * - Import Japanese sv4a set: await importTCGdexGitHub({ language: 'ja', region: 'asia', setIds: ['sv4a'] })
 * - Import all default Japanese sets: await importTCGdexGitHub({ language: 'ja', region: 'asia' })
 * - Import English sets: await importTCGdexGitHub({ language: 'en', region: 'international' })
 */

import { supabase } from '../src/integrations/supabase/client';

interface ImportOptions {
  language?: string;
  region?: 'international' | 'asia';
  setIds?: string[];
  batchSize?: number;
}

export async function importTCGdexGitHub(options: ImportOptions = {}) {
  const {
    language = 'en',
    region = 'international',
    setIds = null,
    batchSize = 50
  } = options;

  console.log('🚀 Starting TCGdex GitHub import...');
  console.log('📦 Repository: https://github.com/tcgdex/cards-database');
  console.log(`🌍 Language: ${language}`);
  console.log(`🗺️  Region: ${region}`);
  
  if (setIds) {
    console.log(`🎯 Target sets: ${setIds.join(', ')}`);
  } else {
    console.log('🎯 Importing default sets for this language/region');
  }

  try {
    const { data, error } = await supabase.functions.invoke('import-tcgdex-github', {
      body: { 
        language,
        region,
        setIds,
        batchSize
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

// Example usage - uncomment to run:

// Import Japanese sv4a set (all 360 cards including 143/190, 151/190, 167/190)
// importTCGdexGitHub({ language: 'ja', region: 'asia', setIds: ['sv4a'] });

// Import multiple Japanese sets
// importTCGdexGitHub({ language: 'ja', region: 'asia', setIds: ['sv4a', 'sv1', 'sv2', 'sv3'] });

// Import all default English sets
// importTCGdexGitHub({ language: 'en', region: 'international' });
