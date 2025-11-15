import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log(`Generating recommendations for user: ${user.id}`);

    // Fetch user preferences
    const { data: preferences, error: prefError } = await supabaseClient
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (prefError && prefError.code !== 'PGRST116') {
      console.error('Error fetching preferences:', prefError);
    }

    // Fetch active listings
    const { data: listings, error: listingsError } = await supabaseClient
      .from('listings')
      .select(`
        id,
        title,
        description,
        category,
        subcategory,
        brand,
        size,
        color,
        condition,
        seller_price,
        style_tags,
        created_at,
        images:listing_images(image_url, display_order)
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(100);

    if (listingsError) throw listingsError;
    if (!listings || listings.length === 0) {
      return new Response(
        JSON.stringify({ recommendations: [], message: "No active listings available" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Build context for AI ranking
    const userContext = preferences ? {
      sizes: preferences.sizes || [],
      brands: preferences.brands || [],
      categories: preferences.categories || [],
      colors: preferences.colors || [],
      style_tags: preferences.style_tags || [],
      budget_min: preferences.budget_min,
      budget_max: preferences.budget_max
    } : {
      sizes: [],
      brands: [],
      categories: [],
      colors: [],
      style_tags: [],
      budget_min: null,
      budget_max: null
    };

    console.log('User preferences:', userContext);
    console.log(`Ranking ${listings.length} listings`);

    // Use AI to rank listings based on user preferences
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a fashion recommendation agent. Rank listings based on how well they match user preferences. Consider: size match, brand preference, category interest, style alignment, budget fit, and overall relevance. Output ONLY valid JSON.`
          },
          {
            role: "user",
            content: `Rank these ${listings.length} listings for a user with these preferences: ${JSON.stringify(userContext)}

Listings to rank:
${listings.map((l, i) => `${i + 1}. ${l.title} - ${l.brand || 'No brand'} - ${l.category}/${l.subcategory} - Size: ${l.size || 'N/A'} - £${l.seller_price} - Styles: ${JSON.stringify(l.style_tags || [])} - Color: ${l.color || 'N/A'}`).join('\n')}

Return the top 20 listing indices (1-based) ranked by fit score, with reasoning for each.`
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "rank_listings",
            description: "Rank listings by user fit score",
            parameters: {
              type: "object",
              properties: {
                recommendations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      listing_index: { type: "number", description: "1-based index from the listings array" },
                      fit_score: { type: "number", description: "Score 0-100 indicating match quality" },
                      reasoning: { type: "string", description: "Brief explanation of why this matches" }
                    },
                    required: ["listing_index", "fit_score", "reasoning"]
                  }
                }
              },
              required: ["recommendations"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "rank_listings" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI request failed: ${response.status}`);
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("No tool call in AI response");
    }

    const rankings = JSON.parse(toolCall.function.arguments);
    console.log(`AI ranked ${rankings.recommendations.length} listings`);

    // Map rankings back to actual listings
    const rankedListings = rankings.recommendations
      .map((rec: any) => {
        const listing = listings[rec.listing_index - 1]; // Convert 1-based to 0-based
        if (!listing) return null;
        return {
          ...listing,
          fit_score: rec.fit_score,
          reasoning: rec.reasoning
        };
      })
      .filter(Boolean)
      .slice(0, 20); // Top 20 recommendations

    return new Response(
      JSON.stringify({
        recommendations: rankedListings,
        user_has_preferences: !!preferences,
        total_listings_evaluated: listings.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating recommendations:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        recommendations: []
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
