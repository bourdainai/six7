import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { listingId } = await req.json();

    if (!listingId) {
      throw new Error('listingId is required');
    }

    console.log('Optimizing tags for listing:', listingId);

    // Get listing details
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('*')
      .eq('id', listingId)
      .eq('seller_id', user.id)
      .single();

    if (listingError || !listing) {
      throw new Error('Listing not found or unauthorized');
    }

    // Prepare context for AI
    const context = {
      title: listing.title,
      description: listing.description,
      category: listing.category,
      subcategory: listing.subcategory,
      brand: listing.brand,
      color: listing.color,
      material: listing.material,
      condition: listing.condition,
      current_style_tags: listing.style_tags || [],
    };

    if (!LOVABLE_API_KEY) {
      // Fallback: rule-based tag suggestions
      const suggestions = generateRuleBasedTags(context);
      
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            suggested_tags: suggestions,
            current_tags: context.current_style_tags,
            method: 'rule-based',
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use AI to generate optimized tags
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a fashion tagging expert. Generate relevant style tags for clothing items to improve searchability.',
          },
          {
            role: 'user',
            content: `Generate 5-10 relevant style tags for this item:\n\n${JSON.stringify(context, null, 2)}\n\nTags should be specific, searchable terms like: vintage, minimalist, Y2K, streetwear, formal, casual, boho, preppy, athletic, etc.\n\nReturn only a JSON array of tag strings.`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || '[]';
    
    // Parse AI response
    let suggestedTags = [];
    try {
      suggestedTags = JSON.parse(aiContent);
    } catch {
      // Extract tags if response is not pure JSON
      const matches = aiContent.match(/\[([^\]]+)\]/);
      if (matches) {
        suggestedTags = matches[1].split(',').map((s: string) => s.trim().replace(/['"]/g, ''));
      }
    }

    // Combine with rule-based suggestions
    const ruleBasedTags = generateRuleBasedTags(context);
    const allSuggestions = [...new Set([...suggestedTags, ...ruleBasedTags])];

    // Filter out existing tags
    const newTags = allSuggestions.filter(
      tag => !context.current_style_tags.includes(tag)
    );

    console.log(`Generated ${newTags.length} new tag suggestions`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          suggested_tags: newTags.slice(0, 10),
          current_tags: context.current_style_tags,
          method: 'ai-enhanced',
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in tag optimizer:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function generateRuleBasedTags(context: any): string[] {
  const tags = [];

  // Brand-based tags
  const luxuryBrands = ['Gucci', 'Prada', 'Louis Vuitton', 'Chanel', 'Dior'];
  if (context.brand && luxuryBrands.includes(context.brand)) {
    tags.push('luxury', 'designer');
  }

  // Condition-based tags
  if (context.condition === 'new_with_tags') {
    tags.push('new', 'unworn');
  } else if (context.condition === 'like_new') {
    tags.push('barely worn', 'mint condition');
  } else if (context.condition === 'excellent' || context.condition === 'good') {
    tags.push('pre-loved', 'gently used');
  }

  // Color-based tags
  if (context.color) {
    const color = context.color.toLowerCase();
    if (['black', 'white', 'grey', 'navy'].includes(color)) {
      tags.push('neutral', 'versatile');
    }
    if (['red', 'yellow', 'orange', 'pink'].includes(color)) {
      tags.push('bold', 'statement');
    }
  }

  // Category-based tags
  const categoryMap: Record<string, string[]> = {
    'Dresses': ['occasion wear', 'feminine'],
    'Tops': ['everyday', 'layering'],
    'Jeans': ['denim', 'casual'],
    'Shoes': ['footwear'],
    'Bags': ['accessories'],
    'Coats': ['outerwear', 'winter'],
  };

  if (context.category && categoryMap[context.category]) {
    tags.push(...categoryMap[context.category]);
  }

  // Material-based tags
  if (context.material) {
    const material = context.material.toLowerCase();
    if (material.includes('silk') || material.includes('cashmere')) {
      tags.push('premium', 'luxury');
    }
    if (material.includes('cotton')) {
      tags.push('comfortable', 'breathable');
    }
    if (material.includes('wool')) {
      tags.push('warm', 'winter');
    }
  }

  return tags;
}
