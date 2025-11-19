import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Expects an array of comp data
    const { comps } = await req.json();

    if (!comps || !Array.isArray(comps)) {
      throw new Error('Invalid payload: "comps" array is required');
    }

    console.log(`Ingesting ${comps.length} pricing comps`);

    // Validate and format data
    const formattedComps = comps.map((comp: any) => ({
      card_id: comp.card_id,
      source: comp.source,
      price: comp.price,
      currency: comp.currency || 'GBP',
      condition: comp.condition,
      date_sold: comp.date_sold || new Date().toISOString(),
      listing_title: comp.listing_title,
      listing_url: comp.listing_url,
    }));

    const { error } = await supabase
      .from('pricing_comps')
      .insert(formattedComps);

    if (error) {
      throw error;
    }

    // Trigger market price recalculation for affected cards
    // In a real system, this might be async or batched
    const affectedCardIds = [...new Set(formattedComps.map((c: any) => c.card_id))];
    
    // For now, we just log it, but we could call another function or DB trigger
    console.log(`Triggering market price update for ${affectedCardIds.length} cards`);

    return new Response(
      JSON.stringify({ message: `Ingested ${comps.length} pricing comps` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

