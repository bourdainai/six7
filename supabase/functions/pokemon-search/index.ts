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
    if (!apiKey) {
      console.warn("POKEMON_TCG_API_KEY is not set. Rate limits will be restricted.");
    }

    const { query, page = 1, pageSize = 20 } = await req.json();

    if (!query) {
      throw new Error("Query parameter is required");
    }

    const trimmedQuery = query.trim();
    let apiQuery = "";

    // Regex patterns
    const numberSlashTotal = /^(\d+|[a-zA-Z0-9]+)\/(\d+|[a-zA-Z0-9]+)$/; // e.g. "179/131" or "TG01/TG30"
    const justNumber = /^(\d+)$/; // e.g. "179"

    const slashMatch = trimmedQuery.match(numberSlashTotal);
    const numberMatch = trimmedQuery.match(justNumber);

    if (slashMatch) {
      // Case: "179/131" -> Search specifically for number:179
      // Ideally, we'd also filter by set printedTotal, but the API doesn't support searching by set.printedTotal directly in the query string easily without fetching all sets.
      // Best approach: Search exact number match. The API results will likely contain the right one.
      // We can also try to match set ptcgoCode if the user typed "SWSH01 179" but here they typed "179/131".
      const cardNumber = slashMatch[1];
      // We prioritize the exact number. 
      apiQuery = `number:"${cardNumber}"`;
      console.log(`Detected number/total format. Searching for number: ${cardNumber}`);
    } else if (numberMatch) {
        // Case: "179" -> Could be a card number. Prioritize number search.
        apiQuery = `number:"${trimmedQuery}"`;
    } else {
        // Fallback to existing logic for name/mixed
        const parts = trimmedQuery.split(/\s+/);
        if (parts.length > 1) {
            const lastPart = parts[parts.length - 1];
            const namePart = parts.slice(0, -1).join(" ");
            
            if (/^\d+$/.test(lastPart) || /^[a-zA-Z0-9]+$/.test(lastPart)) {
                 apiQuery = `name:"${namePart}*" number:"${lastPart}"`;
            } else {
                 apiQuery = `name:"${trimmedQuery}*"`;
            }
        } else {
            apiQuery = `name:"${trimmedQuery}*"`;
        }
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

    if (response.status === 504 || response.status >= 500) {
      const errorText = await response.text();
      console.error("Pokémon API Error (5xx):", response.status, errorText);
      return new Response(
        JSON.stringify({
          error: "External Pokémon card database is temporarily unavailable. Please try again in a minute.",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Pokémon API Error:", response.status, errorText.slice(0, 500));
      throw new Error(`Pokémon API responded with ${response.status}`);
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
        images: card.set.images,
        printedTotal: card.set.printedTotal,
        total: card.set.total
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
