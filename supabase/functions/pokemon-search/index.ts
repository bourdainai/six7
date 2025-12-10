import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const POKEMON_API_URL = "https://api.pokemontcg.io/v2";

interface SearchResult {
  id: string;
  name: string;
  supertype?: string;
  subtypes?: string[];
  set: {
    id: string;
    name: string;
    series?: string;
    ptcgoCode?: string;
    releaseDate?: string;
    images?: any;
    printedTotal?: number;
    total?: number;
  };
  number: string;
  artist?: string;
  rarity?: string;
  flavorText?: string;
  images?: {
    small?: string;
    large?: string;
  };
  tcgplayer?: any;
  cardmarket?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const apiKey = Deno.env.get('POKEMON_TCG_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { query, page = 1, pageSize = 20 } = await req.json();

    if (!query) {
      throw new Error("Query parameter is required");
    }

    const trimmedQuery = query.trim();
    let localResults: SearchResult[] = [];
    let searchSource = 'local';

    // Parse query to determine search strategy
    const numberSlashTotal = /^(\d+|[a-zA-Z0-9]+)\/(\d+|[a-zA-Z0-9]+)$/;
    const justNumber = /^(\d+)$/;
    const setCodeNumber = /^([a-zA-Z0-9]+)\s+(\d+|[a-zA-Z0-9]+)$/; // e.g. "SWSH01 179"
    const nameNumber = /^(.+?)\s+(\d+)$/; // e.g. "Charizard 4"

    const slashMatch = trimmedQuery.match(numberSlashTotal);
    const numberMatch = trimmedQuery.match(justNumber);
    const setCodeMatch = trimmedQuery.match(setCodeNumber);
    const nameNumberMatch = trimmedQuery.match(nameNumber);

    // Try local database search first
    try {
      let dbQuery = supabase
        .from('pokemon_card_attributes')
        .select('*')
        .limit(pageSize);

      if (slashMatch) {
        // Case: "179/131" or "125/094" -> Search by printed_number first, then fallback to number
        const cardNumber = slashMatch[1];
        const totalPart = slashMatch[2];
        const paddedTotal = totalPart.padStart(3, '0');
        const fullPrintedNumber = `${cardNumber}/${paddedTotal}`;
        
        // Search by printed_number OR number for broader matching
        dbQuery = dbQuery.or(`printed_number.eq.${fullPrintedNumber},printed_number.eq.${trimmedQuery},number.eq.${cardNumber}`);
        console.log(`Local search: printed_number="${fullPrintedNumber}" or number="${cardNumber}"`);
      } else if (setCodeMatch) {
        // Case: "SWSH01 179" -> Search by set_code + number
        const [, setCode, cardNumber] = setCodeMatch;
        dbQuery = dbQuery.eq('set_code', setCode).eq('number', cardNumber);
        console.log(`Local search: set_code="${setCode}", number="${cardNumber}"`);
      } else if (nameNumberMatch) {
        // Case: "Charizard 4" -> Search by name + number (includes English names for Japanese cards)
        const [, namePart, cardNumber] = nameNumberMatch;
        dbQuery = dbQuery
          .or(`name.ilike.%${namePart}%,name_en.ilike.%${namePart}%`)
          .eq('number', cardNumber);
        console.log(`Local search: name~"${namePart}", number="${cardNumber}"`);
      } else if (numberMatch) {
        // Case: "179" -> Search by number only
        dbQuery = dbQuery.eq('number', trimmedQuery);
        console.log(`Local search: number="${trimmedQuery}"`);
      } else {
        // Case: Name search -> Search both original and English names
        dbQuery = dbQuery.or(`name.ilike.%${trimmedQuery}%,name_en.ilike.%${trimmedQuery}%`);
        console.log(`Local search: name/name_en~"${trimmedQuery}"`);
      }

      // Add ranking: prioritize by popularity_score, then last_searched_at
      dbQuery = dbQuery
        .order('popularity_score', { ascending: false })
        .order('last_searched_at', { ascending: false });

      const { data: localCards, error: localError } = await dbQuery;

      if (localError) {
        console.error('Local search error:', localError);
      } else if (localCards && localCards.length > 0) {
        // Update popularity_score and last_searched_at for found cards
        const cardIds = localCards.map(c => c.card_id);
        if (cardIds.length > 0) {
          const { error: rpcError } = await supabase.rpc('increment_card_popularity', { card_ids: cardIds });
          if (rpcError) {
            console.error('Error incrementing card popularity:', rpcError);
          }
        }

      // Transform local database results to match API format
      // Use English names when available for better display
      localResults = localCards.map((card: any) => ({
        id: card.card_id,
        name: card.name_en || card.name,
        name_original: card.name,
        name_en: card.name_en,
        supertype: card.supertype,
        subtypes: card.subtypes || [],
        set: {
          id: card.set_code,
          name: card.set_name_en || card.set_name,
          name_original: card.set_name,
          ptcgoCode: card.set_code,
        },
        number: card.number,
        artist: card.artist,
        rarity: card.rarity,
        images: card.images || {},
        tcgplayer: card.tcgplayer_prices || {},
        cardmarket: card.cardmarket_prices || {},
      }));

        console.log(`Found ${localResults.length} cards locally`);
      }
    } catch (localError) {
      console.error('Local database search failed:', localError);
    }

    // If we found local results, return them immediately
    if (localResults.length > 0) {
      return new Response(
        JSON.stringify({
          data: localResults,
          count: localResults.length,
          totalCount: localResults.length,
          page: 1,
          source: 'local'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fallback to external API if no local results
    console.log('No local results found, querying external API...');
    searchSource = 'api';

    if (!apiKey) {
      console.warn("POKEMON_TCG_API_KEY is not set. Rate limits will be restricted.");
    }

    let apiQuery = "";

    if (slashMatch) {
      const cardNumber = slashMatch[1];
      apiQuery = `number:"${cardNumber}"`;
      console.log(`API search: number="${cardNumber}"`);
    } else if (numberMatch) {
      apiQuery = `number:"${trimmedQuery}"`;
    } else {
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

    // Cache API results to database
    if (data.data && data.data.length > 0) {
      const cardsToCache = data.data.map((card: any) => ({
        card_id: card.id,
        name: card.name,
        set_name: card.set.name,
        set_code: card.set.id,
        number: card.number,
        rarity: card.rarity,
        artist: card.artist,
        types: card.types || [],
        subtypes: card.subtypes || [],
        supertype: card.supertype,
        images: card.images || {},
        tcgplayer_id: card.tcgplayer?.url?.split('/').pop(),
        cardmarket_id: card.cardmarket?.url?.split('/').pop(),
        tcgplayer_prices: card.tcgplayer?.prices || null,
        cardmarket_prices: card.cardmarket?.prices || null,
        last_price_update: card.tcgplayer?.prices || card.cardmarket?.prices ? new Date().toISOString() : null,
        synced_at: new Date().toISOString(),
        sync_source: 'on_demand',
        popularity_score: 1, // Initial score for newly cached cards
        last_searched_at: new Date().toISOString(),
      }));

      // Upsert cards to cache them
      const { error: cacheError } = await supabase
        .from('pokemon_card_attributes')
        .upsert(cardsToCache, { onConflict: 'card_id' });

      if (cacheError) {
        console.error('Error caching cards:', cacheError);
      } else {
        console.log(`Cached ${cardsToCache.length} cards from API`);
      }
    }

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
        page: data.page,
        source: 'api'
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
