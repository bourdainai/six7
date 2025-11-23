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

    // Get user's current inventory
    const { data: userListings, error: listingsError } = await supabase
      .from('listings')
      .select('id, title, card_id, seller_price, condition, category')
      .eq('seller_id', user.id)
      .eq('status', 'active');

    if (listingsError) throw listingsError;

    // Get market trends for cards user has
    const cardIds = userListings?.map(l => l.card_id).filter(Boolean) || [];
    const { data: trends, error: trendsError } = await supabase
      .from('trade_market_trends')
      .select('*')
      .in('card_id', cardIds)
      .order('date', { ascending: false })
      .limit(100);

    if (trendsError) throw trendsError;

    // Get popular cards user doesn't have
    const { data: popularCards, error: popularError } = await supabase
      .from('pokemon_card_attributes')
      .select('card_id, name, set_name, rarity, images, cardmarket_prices')
      .order('popularity_score', { ascending: false })
      .limit(50);

    if (popularError) throw popularError;

    // Get potential trade partners with matching interests
    const { data: otherListings, error: othersError } = await supabase
      .from('listings')
      .select('id, title, card_id, seller_price, condition, seller_id, category')
      .neq('seller_id', user.id)
      .eq('status', 'active')
      .eq('trade_enabled', true)
      .limit(100);

    if (othersError) throw othersError;

    // Use AI to generate recommendations
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
          content: `Analyze this trading scenario and recommend top 3 trades:

User's Inventory: ${JSON.stringify(userListings?.slice(0, 10))}
Market Trends: ${JSON.stringify(trends?.slice(0, 20))}
Available Trades: ${JSON.stringify(otherListings?.slice(0, 20))}
Popular Cards: ${JSON.stringify(popularCards?.slice(0, 10))}

For each recommendation, provide:
1. Which cards the user should offer
2. Which cards they should request
3. Confidence score (0-100)
4. Detailed reasoning
5. Estimated value gain

Return as JSON array with structure: [{offeredCards: [], requestedCards: [], confidenceScore: number, reasoning: string, valueGain: number}]`
        }]
      })
    });

    const aiData = await aiResponse.json();
    const recommendations = JSON.parse(aiData.choices[0].message.content);

    // Store recommendations in database
    const recommendationsToInsert = recommendations.map((rec: any) => ({
      user_id: user.id,
      recommended_offer: rec,
      confidence_score: rec.confidenceScore,
      reasoning: rec.reasoning,
      potential_value_gain: rec.valueGain,
      status: 'pending'
    }));

    const { data: inserted, error: insertError } = await supabase
      .from('trade_recommendations')
      .insert(recommendationsToInsert)
      .select();

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ recommendations: inserted }),
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