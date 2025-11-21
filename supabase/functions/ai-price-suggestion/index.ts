import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const priceSuggestionSchema = z.object({
  card_name: z.string().min(1).max(200),
  set_code: z.string().max(20).optional(),
  card_number: z.string().max(20).optional(),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { card_name, set_code, card_number } = priceSuggestionSchema.parse(body);

    console.log(`Price lookup: ${card_name} (${set_code} ${card_number})`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Check our database first
    let query = supabase
      .from('pokemon_card_attributes')
      .select('*')
      .ilike('name', `%${card_name}%`)
      .limit(10);

    if (set_code) {
      query = query.eq('set_code', set_code);
    }
    if (card_number) {
      query = query.eq('number', card_number);
    }

    const { data: dbCards, error: dbError } = await query;

    if (dbError) {
      console.error('DB query error:', dbError);
    }

    // Check if we have recent price data (within last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    let cardWithPrice = null;

    if (dbCards && dbCards.length > 0) {
      // Find card with recent price data
      cardWithPrice = dbCards.find(c => 
        c.last_price_update && 
        c.last_price_update > sevenDaysAgo && 
        (c.tcgplayer_prices || c.cardmarket_prices)
      );

      // If we have the card but stale/no price, use the first match for updating
      if (!cardWithPrice && dbCards[0]) {
        console.log('Card found in DB but price stale, fetching fresh data...');
        cardWithPrice = dbCards[0];
      }
    }

    // 2. If no card or stale price, fetch from API (ONLY NOW)
    if (!cardWithPrice || !cardWithPrice.last_price_update || cardWithPrice.last_price_update < sevenDaysAgo) {
      console.log('Fetching fresh price from API...');
      
      const apiKey = Deno.env.get('POKEMON_TCG_API_KEY');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) headers['X-Api-Key'] = apiKey;

      let searchQuery = '';
      if (set_code && card_number) {
        searchQuery = `name:"${card_name}" number:"${card_number}"`;
      } else {
        searchQuery = `name:"${card_name}"`;
      }

      const apiUrl = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(searchQuery)}&pageSize=1`;
      const response = await fetch(apiUrl, { headers });
      const data = await response.json();

      if (data.data && data.data.length > 0) {
        const apiCard = data.data[0];
        
        // Update or insert the card with fresh price data
        const now = new Date().toISOString();
        const upsertData = {
          card_id: apiCard.id,
          name: apiCard.name,
          set_name: apiCard.set.name,
          set_code: apiCard.set.id,
          number: apiCard.number,
          rarity: apiCard.rarity,
          supertype: apiCard.supertype,
          subtypes: apiCard.subtypes,
          types: apiCard.types,
          images: apiCard.images,
          tcgplayer_prices: apiCard.tcgplayer?.prices || null,
          cardmarket_prices: apiCard.cardmarket?.prices || null,
          last_price_update: now,
          updated_at: now,
          sync_source: 'pokemon_tcg_api',
          synced_at: now,
        };

        const { data: upserted, error: upsertError } = await supabase
          .from('pokemon_card_attributes')
          .upsert(upsertData, { onConflict: 'card_id' })
          .select()
          .single();

        if (upsertError) {
          console.error('Upsert error:', upsertError);
        } else {
          cardWithPrice = upserted;
        }
      }
    }

    // 3. Return price data
    if (!cardWithPrice) {
      throw new Error('Card not found');
    }

    // Extract market price from available sources
    let marketPrice = 0;
    let priceRange = { low: 0, high: 0 };

    if (cardWithPrice.tcgplayer_prices) {
      const prices = cardWithPrice.tcgplayer_prices as any;
      const priceData = prices.holofoil || prices.reverseHolofoil || prices.normal || 
                       prices['1stEditionHolofoil'] || prices.unlimitedHolofoil || 
                       Object.values(prices)[0];
      
      if (priceData && typeof priceData === 'object') {
        marketPrice = priceData.market || priceData.mid || 0;
        priceRange = {
          low: priceData.low || (marketPrice * 0.8),
          high: priceData.high || (marketPrice * 1.2)
        };
      }
    } else if (cardWithPrice.cardmarket_prices) {
      const prices = cardWithPrice.cardmarket_prices as any;
      marketPrice = prices.averageSellPrice || prices.avg1 || 0;
      priceRange = {
        low: prices.lowPrice || (marketPrice * 0.8),
        high: prices.trendPrice || (marketPrice * 1.2)
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        found: true,
        card_id: cardWithPrice.card_id,
        name: cardWithPrice.name,
        set: cardWithPrice.set_name,
        suggestedPrice: marketPrice,
        currency: 'USD',
        range: priceRange,
        lastUpdated: cardWithPrice.last_price_update,
        message: marketPrice > 0 ? undefined : 'Card found but no market price available'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: 'Invalid request data', details: error.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
