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

    console.log("🔧 Starting printed_number backfill...");

    // Fetch sets data from GitHub to get printed totals
    const response = await fetch(
      "https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master/sets/en.json"
    );
    const sets = await response.json();

    // Create a map of set_code -> printedTotal
    const setTotals = new Map<string, number>();
    for (const set of sets) {
      if (set.printedTotal) {
        setTotals.set(set.id, set.printedTotal);
      }
    }

    console.log(`📦 Loaded ${setTotals.size} sets with printed totals`);

    // Fetch all cards that need updating (missing printed_number or it doesn't include "/")
    const { data: cards, error: fetchError } = await supabaseClient
      .from("pokemon_card_attributes")
      .select("id, card_id, number, set_code, printed_number, printed_total, display_number, search_number")
      .or("printed_number.is.null,printed_total.is.null")
      .not("number", "is", null)
      .limit(5000);

    if (fetchError) {
      throw new Error(`Failed to fetch cards: ${fetchError.message}`);
    }

    console.log(`📄 Found ${cards?.length || 0} cards to update`);

    if (!cards || cards.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No cards need updating",
          updated: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let updated = 0;
    let errors = 0;
    const batchSize = 100;

    for (let i = 0; i < cards.length; i += batchSize) {
      const batch = cards.slice(i, i + batchSize);
      
      for (const card of batch) {
        const setCode = card.set_code;
        const number = card.number;
        
        if (!number) continue;

        // Get printed total from our map or use existing
        let printedTotal = card.printed_total || setTotals.get(setCode);
        
        // If still no printed total, try to infer from other cards in same set
        if (!printedTotal) {
          const { data: sameSetCard } = await supabaseClient
            .from("pokemon_card_attributes")
            .select("printed_total")
            .eq("set_code", setCode)
            .not("printed_total", "is", null)
            .limit(1)
            .single();
          
          if (sameSetCard?.printed_total) {
            printedTotal = sameSetCard.printed_total;
          }
        }

        // Build the printed number format (e.g., "2/75")
        // Use the actual number without padding for display
        let printedNumber: string;
        let displayNumber: string;
        let searchNumber: string;

        if (printedTotal) {
          // Format: "2/75" - no leading zeros for main display
          printedNumber = `${number}/${printedTotal}`;
          displayNumber = `${number}/${printedTotal}`;
          
          // Search number includes multiple formats for searching:
          // - "2/75" (unpadded)
          // - "02/75" (padded to 2 digits)
          // - "002/75" (padded to 3 digits)
          // - Just the number for partial matches
          const paddedNum2 = String(number).padStart(2, '0');
          const paddedNum3 = String(number).padStart(3, '0');
          searchNumber = `${number} ${number}/${printedTotal} ${paddedNum2}/${printedTotal} ${paddedNum3}/${printedTotal}`;
        } else {
          // No total available, just use the number
          printedNumber = number;
          displayNumber = number;
          searchNumber = number;
        }

        const { error: updateError } = await supabaseClient
          .from("pokemon_card_attributes")
          .update({
            printed_number: printedNumber,
            display_number: displayNumber,
            search_number: searchNumber,
            printed_total: printedTotal || null,
          })
          .eq("id", card.id);

        if (updateError) {
          console.error(`Error updating ${card.card_id}:`, updateError);
          errors++;
        } else {
          updated++;
        }
      }

      console.log(`Progress: ${Math.min(i + batchSize, cards.length)}/${cards.length} processed`);
    }

    console.log(`✅ Completed: ${updated} updated, ${errors} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Updated ${updated} cards with printed numbers`,
        totalCards: cards.length,
        updated,
        errors,
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
