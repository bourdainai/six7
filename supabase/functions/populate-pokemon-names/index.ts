import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// PokeAPI CSV URLs from GitHub
const SPECIES_NAMES_URL = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_species_names.csv';

interface SpeciesName {
  pokemon_species_id: number;
  local_language_id: number;
  name: string;
  genus: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Fetching Pokemon species names from PokeAPI CSV...');
    
    // Fetch the CSV file
    const response = await fetch(SPECIES_NAMES_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.status}`);
    }
    
    const csvText = await response.text();
    const lines = csvText.split('\n');
    
    // Parse CSV header
    const header = lines[0].split(',');
    console.log('CSV Header:', header);
    
    // Parse all rows
    const speciesNames: SpeciesName[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Handle CSV properly (some names might have commas in quotes)
      const values = line.split(',');
      if (values.length >= 4) {
        speciesNames.push({
          pokemon_species_id: parseInt(values[0]),
          local_language_id: parseInt(values[1]),
          name: values[2],
          genus: values[3] || '',
        });
      }
    }
    
    console.log(`Parsed ${speciesNames.length} name entries`);
    
    // Group by species ID
    const speciesMap = new Map<number, { japanese?: string; english?: string }>();
    
    for (const entry of speciesNames) {
      const speciesId = entry.pokemon_species_id;
      if (!speciesMap.has(speciesId)) {
        speciesMap.set(speciesId, {});
      }
      
      const species = speciesMap.get(speciesId)!;
      
      // Language ID 1 = Japanese, 9 = English
      if (entry.local_language_id === 1) {
        species.japanese = entry.name;
      } else if (entry.local_language_id === 9) {
        species.english = entry.name;
      }
    }
    
    console.log(`Found ${speciesMap.size} unique Pokemon species`);
    
    // Build insert data
    const insertData: { dex_id: number; japanese_name: string; english_name: string }[] = [];
    
    for (const [dexId, names] of speciesMap) {
      if (names.japanese && names.english) {
        insertData.push({
          dex_id: dexId,
          japanese_name: names.japanese,
          english_name: names.english,
        });
      }
    }
    
    console.log(`Prepared ${insertData.length} Pokemon with both Japanese and English names`);
    
    // Clear existing data and insert new
    const { error: deleteError } = await supabase
      .from('pokemon_english_names')
      .delete()
      .gte('dex_id', 0);
    
    if (deleteError) {
      console.error('Delete error:', deleteError);
    }
    
    // Insert in batches of 500
    const batchSize = 500;
    let inserted = 0;
    
    for (let i = 0; i < insertData.length; i += batchSize) {
      const batch = insertData.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('pokemon_english_names')
        .insert(batch);
      
      if (insertError) {
        console.error(`Insert error at batch ${i}:`, insertError);
        throw insertError;
      }
      
      inserted += batch.length;
      console.log(`Inserted ${inserted}/${insertData.length} Pokemon names`);
    }
    
    // Log some examples
    const { data: examples } = await supabase
      .from('pokemon_english_names')
      .select('*')
      .limit(10);
    
    console.log('Sample entries:', examples);

    return new Response(
      JSON.stringify({
        success: true,
        total_pokemon: insertData.length,
        message: `Successfully populated ${insertData.length} Pokemon name translations`,
        examples: examples?.slice(0, 5),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error populating Pokemon names:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to populate Pokemon names', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
