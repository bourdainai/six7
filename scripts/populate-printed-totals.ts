/**
 * Script to populate printed_total field in pokemon_card_attributes
 * Run this with: npx tsx scripts/populate-printed-totals.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function populatePrintedTotals() {
  console.log('Fetching sets data from GitHub...');
  
  const response = await fetch(
    'https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master/sets/en.json'
  );
  const sets = await response.json();

  console.log(`Loaded ${sets.length} sets from GitHub`);

  const updateQueries: string[] = [];
  
  for (const set of sets) {
    if (set.printedTotal) {
      updateQueries.push(
        `UPDATE pokemon_card_attributes SET printed_total = ${set.printedTotal} WHERE set_code = '${set.id}';`
      );
    }
  }

  console.log('\nGenerated SQL queries. Copy and run these in your database:\n');
  console.log('-- Update printed_total for all sets');
  console.log(updateQueries.join('\n'));
  console.log(`\n-- Total: ${updateQueries.length} sets to update`);
}

populatePrintedTotals();