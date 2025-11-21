import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PRIORITY_SETS = [
  // Japanese SV Series (High Priority - User needs these)
  { code: 'SV4a', name: 'Shiny Treasure ex', language: 'ja', region: 'asia' },
  { code: 'SV1', name: 'Scarlet ex', language: 'ja', region: 'asia' },
  { code: 'SV2', name: 'Violet ex', language: 'ja', region: 'asia' },
  { code: 'SV3', name: 'Obsidian Flames', language: 'ja', region: 'asia' },
  { code: 'SV5', name: 'Wild Force / Cyber Judge', language: 'ja', region: 'asia' },
  { code: 'SV6', name: 'Mask of Change', language: 'ja', region: 'asia' },
  
  // English SV Series
  { code: 'sv1', name: 'Scarlet & Violet', language: 'en', region: 'international' },
  { code: 'sv2', name: 'Paldea Evolved', language: 'en', region: 'international' },
  { code: 'sv3', name: 'Obsidian Flames', language: 'en', region: 'international' },
  { code: 'sv4', name: 'Paradox Rift', language: 'en', region: 'international' },
  { code: 'sv5', name: 'Temporal Forces', language: 'en', region: 'international' },
  { code: 'sv6', name: 'Twilight Masquerade', language: 'en', region: 'international' },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { mode = 'all', specificSets } = await req.json().catch(() => ({}));
    
    console.log('🚀 Starting complete Pokemon import...');
    console.log(`Mode: ${mode}`);

    const results: any = {
      started: new Date().toISOString(),
      sources: {
        tcgdex_github: { attempted: 0, successful: 0, failed: 0 },
        tcgdex_api: { attempted: 0, successful: 0, failed: 0 },
        justtcg: { attempted: 0, successful: 0, failed: 0 }
      },
      totalCards: 0,
      errors: []
    };

    const setsToImport = specificSets || PRIORITY_SETS;

    // Strategy: Try multiple sources for each set until we get complete data
    for (const set of setsToImport) {
      console.log(`\n📦 Processing ${set.name} (${set.code})...`);
      let setComplete = false;

      // Source 1: TCGdex GitHub (most complete for some sets)
      if (!setComplete) {
        try {
          console.log(`  Trying TCGdex GitHub...`);
          results.sources.tcgdex_github.attempted++;

          const { data: githubData, error: githubError } = await supabase.functions.invoke(
            'import-tcgdex-github',
            {
              body: {
                language: set.language,
                region: set.region,
                setIds: [set.code],
                batchSize: 100
              }
            }
          );

          if (!githubError && githubData?.success) {
            results.sources.tcgdex_github.successful++;
            results.totalCards += githubData.totalImported || 0;
            console.log(`  ✅ TCGdex GitHub: ${githubData.totalImported} cards`);
            setComplete = true;
          } else {
            console.log(`  ⚠️  TCGdex GitHub incomplete/failed`);
          }
        } catch (err) {
          results.sources.tcgdex_github.failed++;
          console.log(`  ❌ TCGdex GitHub error:`, err);
        }
      }

      // Source 2: TCGdex API (backup)
      if (!setComplete) {
        try {
          console.log(`  Trying TCGdex API...`);
          results.sources.tcgdex_api.attempted++;

          const { data: apiData, error: apiError } = await supabase.functions.invoke(
            'import-tcgdex-data',
            {
              body: {
                language: set.language,
                setIds: [set.code.toUpperCase()],
                limit: 1000
              }
            }
          );

          if (!apiError && apiData?.success) {
            results.sources.tcgdex_api.successful++;
            results.totalCards += apiData.totalImported || 0;
            console.log(`  ✅ TCGdex API: ${apiData.totalImported} cards`);
            setComplete = true;
          } else {
            console.log(`  ⚠️  TCGdex API incomplete/failed`);
          }
        } catch (err) {
          results.sources.tcgdex_api.failed++;
          console.log(`  ❌ TCGdex API error:`, err);
        }
      }

      // Verify completeness
      const { data: setCards } = await supabase
        .from('pokemon_card_attributes')
        .select('card_id')
        .eq('set_code', set.code);

      const cardCount = setCards?.length || 0;
      console.log(`  📊 Total cards in database for ${set.code}: ${cardCount}`);

      // Small delay between sets
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    results.completed = new Date().toISOString();
    results.summary = `Imported ${results.totalCards} cards across ${setsToImport.length} sets`;

    console.log('\n✅ COMPLETE IMPORT FINISHED!');
    console.log(`📊 Total cards imported: ${results.totalCards}`);
    console.log(`📦 Sets processed: ${setsToImport.length}`);

    return new Response(
      JSON.stringify(results),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Import failed:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
