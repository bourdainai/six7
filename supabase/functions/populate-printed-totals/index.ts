import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("Fetching sets data from GitHub...");
    
    // Fetch sets data from GitHub
    const response = await fetch(
      "https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master/sets/en.json"
    );
    const sets = await response.json();

    console.log(`Loaded ${sets.length} sets from GitHub`);

    let updatedSets = 0;
    const errors = [];

    // Update each set's printed_total
    for (const set of sets) {
      const setCode = set.id;
      const printedTotal = set.printedTotal;

      if (!printedTotal) {
        console.log(`Skipping ${setCode} - no printedTotal`);
        continue;
      }

      console.log(`Updating ${setCode} with printedTotal: ${printedTotal}`);

      const { error } = await supabaseClient
        .from("pokemon_card_attributes")
        .update({ printed_total: printedTotal })
        .eq("set_code", setCode);

      if (error) {
        console.error(`Error updating ${setCode}:`, error);
        errors.push({ set: setCode, error: error.message });
      } else {
        updatedSets++;
      }
    }

    console.log(`Successfully updated ${updatedSets} sets`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Updated ${updatedSets} sets with printed totals`,
        totalSets: sets.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});