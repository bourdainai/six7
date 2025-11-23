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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get user's complete portfolio
    const { data: portfolio, error: portfolioError } = await supabase
      .from('listings')
      .select(`
        *,
        card:pokemon_card_attributes(
          name, set_name, rarity, types, cardmarket_prices, images
        )
      `)
      .eq('seller_id', user.id)
      .eq('status', 'active');

    if (portfolioError) throw portfolioError;

    // Calculate portfolio metrics
    const totalValue = portfolio?.reduce((sum, item) => sum + (item.seller_price || 0), 0) || 0;
    const totalItems = portfolio?.length || 0;

    // Analyze rarity distribution
    const rarityDist = new Map<string, number>();
    const typeDist = new Map<string, number>();
    const setDist = new Map<string, number>();

    for (const item of portfolio || []) {
      const rarity = item.card?.rarity || 'Unknown';
      rarityDist.set(rarity, (rarityDist.get(rarity) || 0) + 1);

      const types = item.card?.types || [];
      for (const type of types) {
        typeDist.set(type, (typeDist.get(type) || 0) + 1);
      }

      const setName = item.card?.set_name || 'Unknown';
      setDist.set(setName, (setDist.get(setName) || 0) + 1);
    }

    // Calculate diversification score (0-100)
    const rarityScore = Math.min(100, (rarityDist.size / 8) * 100); // 8 main rarities
    const typeScore = Math.min(100, (typeDist.size / 18) * 100); // 18 types
    const setScore = Math.min(100, (setDist.size / 10) * 50); // Bonus for set variety
    const diversificationScore = (rarityScore + typeScore + setScore) / 3;

    // Get market trends for optimization advice
    const cardIds = portfolio?.map(p => p.card_id).filter(Boolean) || [];
    const { data: trends, error: trendsError } = await supabase
      .from('trade_market_trends')
      .select('*')
      .in('card_id', cardIds)
      .order('date', { ascending: false });

    if (trendsError) throw trendsError;

    // Use AI to analyze portfolio and suggest optimizations
    const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('OPENROUTER_API_KEY')}`,
        'HTTP-Referer': Deno.env.get('SUPABASE_URL') || 'https://lovable.app',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-exp:free',
        messages: [{
          role: 'user',
          content: `Analyze this Pokemon card portfolio and provide optimization advice:

Total Value: $${totalValue}
Total Items: ${totalItems}
Diversification Score: ${diversificationScore.toFixed(1)}%

Rarity Distribution: ${JSON.stringify(Object.fromEntries(rarityDist))}
Type Distribution: ${JSON.stringify(Object.fromEntries(typeDist))}
Set Distribution: ${JSON.stringify(Object.fromEntries(setDist))}

Recent Cards (sample): ${JSON.stringify(portfolio?.slice(0, 10))}
Market Trends: ${JSON.stringify(trends?.slice(0, 20))}

Provide:
1. Portfolio health score (0-100)
2. Top 5 specific optimization suggestions
3. Cards to consider trading away (with reasons)
4. Cards to acquire (with reasons)
5. Risk assessment

Return as JSON: {healthScore: number, suggestions: string[], cardsToTrade: [{card, reason}], cardsToAcquire: [{card, reason}], riskAssessment: string}`
        }]
      })
    });

    const aiData = await aiResponse.json();
    const analysis = JSON.parse(aiData.choices[0].message.content);

    // Find top cards by value
    const topCards = (portfolio || [])
      .sort((a, b) => (b.seller_price || 0) - (a.seller_price || 0))
      .slice(0, 5)
      .map(item => ({
        card_id: item.card_id,
        name: item.card?.name,
        value: item.seller_price,
        image: item.card?.images
      }));

    // Store portfolio snapshot
    const { data: snapshot, error: snapshotError } = await supabase
      .from('portfolio_snapshots')
      .insert({
        user_id: user.id,
        snapshot_date: new Date().toISOString().split('T')[0],
        total_value: totalValue,
        total_items: totalItems,
        top_cards: topCards,
        portfolio_health_score: analysis.healthScore,
        diversification_score: diversificationScore
      })
      .select()
      .single();

    if (snapshotError) throw snapshotError;

    return new Response(
      JSON.stringify({
        portfolio: {
          totalValue,
          totalItems,
          diversificationScore,
          topCards
        },
        analysis,
        snapshot
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