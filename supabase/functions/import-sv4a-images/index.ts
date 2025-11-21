import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔍 Searching TCGdex for Shiny Treasure ex set...');

    // First, try to find the set in TCGdex API
    const tcgdexSearchUrl = 'https://api.tcgdex.net/v2/en/sets';
    const setsResponse = await fetch(tcgdexSearchUrl);
    const sets = await setsResponse.json();

    // Look for Shiny Treasure ex
    const shinyTreasureSet = sets.find((set: any) => 
      set.name?.toLowerCase().includes('shiny treasure') ||
      set.id?.toLowerCase().includes('sv4a')
    );

    if (shinyTreasureSet) {
      console.log(`✅ Found set in TCGdex: ${shinyTreasureSet.name} (${shinyTreasureSet.id})`);
      
      // Fetch cards for this set
      const cardsUrl = `https://api.tcgdex.net/v2/en/sets/${shinyTreasureSet.id}`;
      const cardsResponse = await fetch(cardsUrl);
      const setData = await cardsResponse.json();

      let updated = 0;
      let failed = 0;

      // Update our database with the correct image URLs
      for (const card of setData.cards || []) {
        try {
          const { error } = await supabase
            .from('pokemon_card_attributes')
            .update({
              images: {
                small: card.image,
                large: card.image
              },
              updated_at: new Date().toISOString()
            })
            .eq('set_code', 'sv4a')
            .eq('number', card.localId);

          if (error) throw error;
          updated++;
        } catch (err) {
          console.error(`Failed to update ${card.localId}:`, err);
          failed++;
        }
      }

      return new Response(JSON.stringify({
        success: true,
        source: 'tcgdex',
        setFound: shinyTreasureSet.name,
        updated,
        failed
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // If not found in TCGdex, mark all sv4a cards as needing user uploads
    console.log('⚠️ Shiny Treasure ex not found in TCGdex. Marking cards for user upload.');

    const { data: sv4aCards } = await supabase
      .from('pokemon_card_attributes')
      .select('id')
      .eq('set_code', 'sv4a')
      .eq('sync_source', 'on_demand');

    let marked = 0;
    for (const card of sv4aCards || []) {
      const updatedMetadata = {
        image_ok: false,
        requires_user_upload: true,
        image_checked_at: new Date().toISOString(),
        note: 'Stock images not available for this set'
      };

      await supabase
        .from('pokemon_card_attributes')
        .update({ 
          metadata: updatedMetadata,
          updated_at: new Date().toISOString()
        })
        .eq('id', card.id);

      marked++;
    }

    return new Response(JSON.stringify({
      success: true,
      source: 'none',
      message: 'Shiny Treasure ex not available in TCGdex',
      markedForUserUpload: marked
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Import error:', error);
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});