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
    const tcgApiKey = Deno.env.get('POKEMON_TCG_API_KEY') ?? '';

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify admin authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    // Check if user has admin role
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roles) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body to see if we have specific parameters
    // e.g. specific set to sync, or page number
    const { setCode, page = 1 } = await req.json().catch(() => ({}));

    console.log(`Syncing TCG data. Set: ${setCode || 'All'}, Page: ${page}`);

    const apiUrl = new URL('https://api.pokemontcg.io/v2/cards');
    if (setCode) {
      apiUrl.searchParams.append('q', `set.id:${setCode}`);
    }
    apiUrl.searchParams.append('page', page.toString());
    apiUrl.searchParams.append('pageSize', '250');

    const tcgResponse = await fetch(apiUrl.toString(), {
      headers: {
        'X-Api-Key': tcgApiKey,
      },
    });

    if (!tcgResponse.ok) {
      throw new Error(`TCG API Error: ${tcgResponse.statusText}`);
    }

    const tcgData = await tcgResponse.json();
    const cards = tcgData.data;

    if (!cards || cards.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No cards found to sync' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const upsertData = cards.map((card: any) => ({
      card_id: card.id,
      name: card.name,
      set_name: card.set.name,
      set_code: card.set.id,
      number: card.number,
      rarity: card.rarity,
      artist: card.artist,
      types: card.types,
      subtypes: card.subtypes,
      supertype: card.supertype,
      images: card.images,
      tcgplayer_id: card.tcgplayer?.url?.split('/').pop(), // Basic extraction
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('pokemon_card_attributes')
      .upsert(upsertData, { onConflict: 'card_id' });

    if (error) {
      console.error('Supabase Upsert Error:', error);
      throw error;
    }

    return new Response(
      JSON.stringify({ 
        message: `Synced ${cards.length} cards`,
        count: tcgData.count,
        totalCount: tcgData.totalCount,
        page: page 
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

