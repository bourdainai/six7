import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get recent completed trades
    const { data: completedTrades, error: tradesError } = await supabase
      .from('trade_completions')
      .select(`
        *,
        offer:trade_offers(
          offered_listings,
          target_listing_id,
          cash_amount,
          accepted_at
        )
      `)
      .order('completed_at', { ascending: false })
      .limit(200);

    if (tradesError) throw tradesError;

    // Get all active listings for market data
    const { data: listings, error: listingsError } = await supabase
      .from('listings')
      .select('card_id, seller_price, created_at, views, saves')
      .eq('status', 'active');

    if (listingsError) throw listingsError;

    // Group by card and calculate trends
    const cardTrends = new Map();
    
    for (const listing of listings || []) {
      if (!listing.card_id) continue;
      
      if (!cardTrends.has(listing.card_id)) {
        cardTrends.set(listing.card_id, {
          card_id: listing.card_id,
          prices: [],
          views: 0,
          saves: 0,
          count: 0
        });
      }
      
      const trend = cardTrends.get(listing.card_id);
      trend.prices.push(listing.seller_price);
      trend.views += listing.views || 0;
      trend.saves += listing.saves || 0;
      trend.count += 1;
    }

    // Calculate market metrics
    const today = new Date().toISOString().split('T')[0];
    const trendsToInsert = [];

    for (const [cardId, data] of cardTrends.entries()) {
      const avgPrice = data.prices.reduce((a: number, b: number) => a + b, 0) / data.prices.length;
      
      // Get historical data to determine trend
      const { data: historical } = await supabase
        .from('trade_market_trends')
        .select('avg_trade_value')
        .eq('card_id', cardId)
        .order('date', { ascending: false })
        .limit(7);

      let priceTrend = 'stable';
      if (historical && historical.length > 0) {
        const weekAgo = historical[historical.length - 1]?.avg_trade_value || avgPrice;
        const change = ((avgPrice - weekAgo) / weekAgo) * 100;
        
        if (change > 5) priceTrend = 'rising';
        else if (change < -5) priceTrend = 'falling';
      }

      trendsToInsert.push({
        card_id: cardId,
        date: today,
        avg_trade_value: avgPrice,
        trade_volume: data.count,
        price_trend: priceTrend,
        popularity_score: data.views + (data.saves * 2)
      });
    }

    // Insert/update market trends
    const { error: insertError } = await supabase
      .from('trade_market_trends')
      .upsert(trendsToInsert, {
        onConflict: 'card_id,date',
        ignoreDuplicates: false
      });

    if (insertError) throw insertError;

    // Get trending cards (biggest movers)
    const { data: trending, error: trendingError } = await supabase
      .from('trade_market_trends')
      .select(`
        *,
        card:pokemon_card_attributes(name, set_name, images, rarity)
      `)
      .eq('date', today)
      .order('popularity_score', { ascending: false })
      .limit(20);

    if (trendingError) throw trendingError;

    return new Response(
      JSON.stringify({
        success: true,
        trendsUpdated: trendsToInsert.length,
        trending: trending
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