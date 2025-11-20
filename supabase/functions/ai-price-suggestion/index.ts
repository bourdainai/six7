import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { card_name, set_code, card_number } = await req.json();

    if (!card_name && !set_code) {
      throw new Error('Card name or set code required');
    }

    console.log(`Searching for: ${card_name} (${set_code} ${card_number})`);

    const apiKey = Deno.env.get('POKEMON_TCG_API_KEY');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['X-Api-Key'] = apiKey;
    }

    // Construct query
    // We prioritize set_code and card_number for exact matches if available
    let query = '';
    if (set_code && card_number) {
      // Try to match exact number first. 
      // Note: set_code from AI might be "BS" but API expects "base1". 
      // The AI might return the printed set code, not the API ID.
      // So we might need to search by name and number if set_code isn't an ID.
      // Let's try a broad search first.
      query = `name:"${card_name}" number:"${card_number}"`;
    } else {
      query = `name:"${card_name}"`;
    }

    const apiUrl = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(query)}`;
    console.log(`Fetching: ${apiUrl}`);

    const response = await fetch(apiUrl, { headers });
    const data = await response.json();

    if (data.error) {
      throw new Error(`Pokemon TCG API Error: ${data.error.message}`);
    }

    if (!data.data || data.data.length === 0) {
      console.log("No exact match found, trying looser search...");
      // Fallback: just name
      const fallbackUrl = `https://api.pokemontcg.io/v2/cards?q=name:"${encodeURIComponent(card_name)}"&pageSize=1`;
      const fallbackResponse = await fetch(fallbackUrl, { headers });
      const fallbackData = await fallbackResponse.json();

      if (!fallbackData.data || fallbackData.data.length === 0) {
        throw new Error('Card not found in database');
      }
      data.data = fallbackData.data;
    }

    // Take the first result
    const card = data.data[0];
    const tcgplayer = card.tcgplayer;

    if (!tcgplayer || !tcgplayer.prices) {
      // If no TCGPlayer data, maybe return a default or error?
      // Let's return what we have (maybe just card info) and 0 price
      return new Response(
        JSON.stringify({
          success: true,
          found: true,
          card_id: card.id,
          name: card.name,
          set: card.set.name,
          suggestedPrice: 0,
          currency: 'USD', // API returns USD
          message: 'Card found but no market price available'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine price based on card type (holofoil, reverseHolofoil, normal)
    // For simplicity, we'll take the "market" price of the first available type
    // Priority: Holofoil > Reverse Holofoil > Normal
    let priceData = tcgplayer.prices.holofoil || tcgplayer.prices.reverseHolofoil || tcgplayer.prices.normal || tcgplayer.prices['1stEditionHolofoil'] || tcgplayer.prices.unlimitedHolofoil;

    if (!priceData) {
      // Fallback to any key
      const keys = Object.keys(tcgplayer.prices);
      if (keys.length > 0) priceData = tcgplayer.prices[keys[0]];
    }

    const marketPrice = priceData?.market || priceData?.mid || 0;

    return new Response(
      JSON.stringify({
        success: true,
        found: true,
        card_id: card.id,
        name: card.name,
        set: card.set.name,
        suggestedPrice: marketPrice,
        currency: 'USD',
        range: {
          low: priceData?.low || (marketPrice * 0.8),
          high: priceData?.high || (marketPrice * 1.2)
        },
        tcgplayerUrl: tcgplayer.url
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
