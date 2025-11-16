import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OutfitRequest {
  baseItemId: string;
  style?: string;
  occasion?: string;
  budget?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { baseItemId, style, occasion, budget }: OutfitRequest = await req.json();

    // Get the base item
    const { data: baseItem, error: itemError } = await supabase
      .from('listings')
      .select('*, listing_images(*)')
      .eq('id', baseItemId)
      .single();

    if (itemError || !baseItem) {
      throw new Error('Base item not found');
    }

    console.log(`Building outfit around: ${baseItem.title}`);

    // Find complementary items
    const { data: allListings, error: listingsError } = await supabase
      .from('listings')
      .select('*, listing_images(*)')
      .eq('status', 'active')
      .neq('id', baseItemId)
      .limit(50);

    if (listingsError) {
      throw new Error('Failed to fetch listings');
    }

    // Use AI to analyze and recommend outfit combinations
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiPrompt = `You are a professional fashion stylist. Create a complete outfit recommendation.

Base Item: ${baseItem.title}
Category: ${baseItem.category}
Color: ${baseItem.color || 'unspecified'}
Brand: ${baseItem.brand || 'unspecified'}
Style Tags: ${JSON.stringify(baseItem.style_tags || [])}
${style ? `Desired Style: ${style}` : ''}
${occasion ? `Occasion: ${occasion}` : ''}
${budget ? `Budget Limit: £${budget}` : ''}

Available Items to Choose From:
${allListings.slice(0, 20).map((item, i) => 
  `${i + 1}. ${item.title} - ${item.category} - £${item.seller_price} - ${item.color || 'N/A'} - ${item.brand || 'N/A'}`
).join('\n')}

Task: Select 2-4 items from the available list that would create a complete, stylish outfit with the base item.

Consider:
1. Color coordination and complementary colors
2. Style coherence (don't mix formal with streetwear)
3. Appropriate categories (if base is top, suggest bottoms, shoes, accessories)
4. Budget constraints
5. Brand harmony (luxury with luxury, streetwear with streetwear)

Return ONLY a JSON object with this exact structure:
{
  "outfit_name": "Brief catchy outfit name",
  "description": "One sentence describing the complete look",
  "selected_items": [1, 5, 12],
  "style_reasoning": "Why these items work together",
  "total_price": 250.00,
  "fit_score": 85
}

The numbers in selected_items must match the item numbers from the available list.`;

    const aiResponse = await fetch('https://api.lovable.app/v1/ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: aiPrompt,
          },
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI request failed: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    const aiContent = aiResult.choices[0]?.message?.content;

    if (!aiContent) {
      throw new Error('No AI response');
    }

    // Parse AI response
    const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid AI response format');
    }

    const outfitSuggestion = JSON.parse(jsonMatch[0]);

    // Map selected items
    const selectedItems = outfitSuggestion.selected_items.map((index: number) => {
      return allListings[index - 1]; // Convert 1-based to 0-based
    }).filter(Boolean);

    const outfit = {
      base_item: {
        id: baseItem.id,
        title: baseItem.title,
        price: baseItem.seller_price,
        image: baseItem.listing_images?.[0]?.image_url,
        category: baseItem.category,
      },
      recommended_items: selectedItems.map((item: any) => ({
        id: item.id,
        title: item.title,
        price: item.seller_price,
        image: item.listing_images?.[0]?.image_url,
        category: item.category,
        brand: item.brand,
        color: item.color,
      })),
      outfit_name: outfitSuggestion.outfit_name,
      description: outfitSuggestion.description,
      style_reasoning: outfitSuggestion.style_reasoning,
      total_price: outfitSuggestion.total_price,
      fit_score: outfitSuggestion.fit_score,
    };

    console.log(`Generated outfit: ${outfit.outfit_name} with ${outfit.recommended_items.length} items`);

    return new Response(
      JSON.stringify({ success: true, outfit }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Outfit builder error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
