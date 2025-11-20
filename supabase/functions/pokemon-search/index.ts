import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const apiKey = Deno.env.get('POKEMON_TCG_API_KEY');
    // Note: Even without a key, the API allows some requests, but rate limits are stricter.
    // We proceed either way, but log a warning if missing.
    if (!apiKey) {
      console.warn("POKEMON_TCG_API_KEY is not set. Rate limits will be restricted.");
    }

    const { query, page = 1, pageSize = 20 } = await req.json();

    if (!query) {
      throw new Error("Query parameter is required");
    }

    // Construct search query for the API
    // We'll search by name or number. The API syntax is quite specific.
    // Example: name:charizard* OR number:4
    
    // Simple heuristic: if it looks like "name number" (e.g. "charizard 4"), split it.
    let apiQuery = "";
    const parts = query.trim().split(/\s+/);
    
    if (parts.length > 1) {
        // Assume last part might be a number if it's digits, otherwise just name search
        const lastPart = parts[parts.length - 1];
        const namePart = parts.slice(0, -1).join(" ");
        
        // Check if last part looks like a card number (digits or simple alphanumeric)
        if (/^\d+$/.test(lastPart) || /^[a-zA-Z0-9]+$/.test(lastPart)) {
             apiQuery = `name:"${namePart}*" number:"${lastPart}"`;
        } else {
             apiQuery = `name:"${query}*"`;
        }
    } else {
        // Single term: search name mostly, but maybe exact number match if short?
        // Safer to just wildcard search name for single terms to start.
        apiQuery = `name:"${query}*"`;
    }

    console.log(`Searching Pokémon TCG API with query: ${apiQuery}`);

    const response = await fetch(
      `${POKEMON_API_URL}/cards?q=${encodeURIComponent(apiQuery)}&page=${page}&pageSize=${pageSize}&orderBy=-set.releaseDate`,
      {
        headers: {
          "X-Api-Key": apiKey || "",
          "Content-Type": "application/json"
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Pokémon API Error:", response.status, errorText);
      throw new Error(`Pokémon API responded with ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    // Return simplified data structure for our frontend
    const cards = data.data.map((card: any) => ({
      id: card.id,
      name: card.name,
      supertype: card.supertype,
      subtypes: card.subtypes,
      set: {
        id: card.set.id,
        name: card.set.name,
        series: card.set.series,
        ptcgoCode: card.set.ptcgoCode,
        releaseDate: card.set.releaseDate,
        images: card.set.images
      },
      number: card.number,
      artist: card.artist,
      rarity: card.rarity,
      flavorText: card.flavorText,
      images: card.images,
      tcgplayer: card.tcgplayer,
      cardmarket: card.cardmarket
    }));

    return new Response(
      JSON.stringify({ 
        data: cards, 
        count: data.count,
        totalCount: data.totalCount,
        page: data.page
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error searching cards:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

