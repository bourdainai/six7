import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const POKEMON_API_URL = "https://api.pokemontcg.io/v2";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const tcgApiKey = Deno.env.get('POKEMON_TCG_API_KEY') ?? '';

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if this is a cron job (no auth required) or admin request
    const authHeader = req.headers.get('Authorization');
    const isCronJob = !authHeader || authHeader.includes('cron-secret');
    
    let isAdmin = false;
    if (authHeader && !isCronJob) {
      const { data: { user }, error: userError } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      );
      
      if (!userError && user) {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .single();
        
        isAdmin = !!roles;
      }
    }

    // Allow cron jobs or admin requests
    if (!isCronJob && !isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Admin access or cron secret required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const { 
      daysBack = 7, // How many days back to fetch price updates
      limit = 2000
    } = body;

    console.log(`Starting Pokemon TCG API price sync (last ${daysBack} days)...`);

    // Fetch cards that need price updates
    // Since Pokemon TCG API doesn't have an updatedAt filter, we'll fetch random batches
    const apiUrl = new URL(`${POKEMON_API_URL}/cards`);
    apiUrl.searchParams.append('pageSize', limit.toString());
    apiUrl.searchParams.append('page', '1');

    const tcgResponse = await fetch(apiUrl.toString(), {
      headers: {
        'X-Api-Key': tcgApiKey,
      },
    });

    if (!tcgResponse.ok) {
      throw new Error(`TCG API Error: ${tcgResponse.statusText}`);
    }

    const tcgData = await tcgResponse.json();
    const cards = tcgData.data || [];

    if (cards.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No cards found for price update' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetched ${cards.length} cards for price updates`);

    const now = new Date().toISOString();
    let updateCount = 0;
    let notFoundCount = 0;
    
    // Update prices for existing cards only
    for (const card of cards) {
      const hasPrices = card.tcgplayer?.prices || card.cardmarket?.prices;
      
      if (!hasPrices) continue;

      const { error: updateError, count } = await supabase
        .from('pokemon_card_attributes')
        .update({
          tcgplayer_prices: card.tcgplayer?.prices || null,
          cardmarket_prices: card.cardmarket?.prices || null,
          last_price_update: now,
          updated_at: now,
        })
        .eq('card_id', card.id);
      
      if (updateError) {
        console.error(`Update Error for ${card.id}:`, updateError);
      } else if (count === 0) {
        notFoundCount++;
      } else {
        updateCount++;
      }
    }
    
    console.log(`✅ Updated prices for ${updateCount} cards, ${notFoundCount} not found in database`);

    // Update sync progress for price updates
    await supabase
      .from('tcg_sync_progress')
      .upsert({
        set_code: 'price-sync',
        set_name: 'Pokemon TCG API Price Updates',
        sync_source: 'pokemon_tcg_api',
        sync_status: 'completed',
        total_cards: cards.length,
        cards_synced: updateCount,
        last_sync_at: now,
      }, {
        onConflict: 'set_code,sync_source'
      });

    return new Response(
      JSON.stringify({ 
        message: `Updated prices for ${updateCount} cards`,
        updated: updateCount,
        notFound: notFoundCount,
        totalProcessed: cards.length
      }),
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
