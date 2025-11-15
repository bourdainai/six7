import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImageSearchRequest {
  imageUrl: string;
  listingId?: string;
  limit?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { imageUrl, listingId, limit = 10 }: ImageSearchRequest = await req.json();

    console.log('Processing image search for:', imageUrl);

    // Analyze the search image using Lovable AI
    const analysisResponse = await fetch('https://api.lovable.app/v1/ai/generate-object', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        prompt: `Analyze this fashion item image and extract key visual features. Return a JSON object with:
- category (clothing type: dress, top, pants, shoes, bag, accessory, etc.)
- color (primary color)
- pattern (solid, striped, floral, animal print, etc.)
- style (casual, formal, vintage, sporty, etc.)
- material (denim, leather, cotton, silk, etc.)
- features (unique characteristics like buttons, pockets, embellishments)
- keywords (5-7 searchable keywords)

Image URL: ${imageUrl}

Return ONLY valid JSON without any markdown or explanation.`,
        responseFormat: {
          type: 'json_object',
        },
      }),
    });

    if (!analysisResponse.ok) {
      console.error('AI analysis failed:', await analysisResponse.text());
      throw new Error('Failed to analyze image');
    }

    const analysis = await analysisResponse.json();
    console.log('Image analysis:', analysis);

    // Build search query based on AI analysis
    const searchTerms: string[] = [];
    
    if (analysis.category) searchTerms.push(analysis.category);
    if (analysis.color) searchTerms.push(analysis.color);
    if (analysis.pattern) searchTerms.push(analysis.pattern);
    if (analysis.style) searchTerms.push(analysis.style);
    if (analysis.keywords && Array.isArray(analysis.keywords)) {
      searchTerms.push(...analysis.keywords);
    }

    // Query listings that match the visual features
    let query = supabase
      .from('listings')
      .select(`
        id,
        title,
        brand,
        seller_price,
        condition,
        category,
        subcategory,
        color,
        material,
        style_tags,
        listing_images(image_url)
      `)
      .eq('status', 'active');

    // Exclude the original listing if provided
    if (listingId) {
      query = query.neq('id', listingId);
    }

    // Filter by category if identified
    if (analysis.category) {
      query = query.or(`category.ilike.%${analysis.category}%,subcategory.ilike.%${analysis.category}%`);
    }

    const { data: listings, error } = await query.limit(limit * 3); // Fetch more for better filtering

    if (error) {
      console.error('Database query error:', error);
      throw error;
    }

    // Score and rank listings based on similarity
    const scoredListings = listings.map((listing) => {
      let score = 0;

      // Category match (highest weight)
      if (analysis.category && (
        listing.category?.toLowerCase().includes(analysis.category.toLowerCase()) ||
        listing.subcategory?.toLowerCase().includes(analysis.category.toLowerCase())
      )) {
        score += 10;
      }

      // Color match
      if (analysis.color && listing.color?.toLowerCase().includes(analysis.color.toLowerCase())) {
        score += 5;
      }

      // Material match
      if (analysis.material && listing.material?.toLowerCase().includes(analysis.material.toLowerCase())) {
        score += 3;
      }

      // Style tags match
      if (analysis.style && listing.style_tags) {
        const styleTags = Array.isArray(listing.style_tags) ? listing.style_tags : [];
        if (styleTags.some((tag: string) => 
          tag.toLowerCase().includes(analysis.style?.toLowerCase() || '')
        )) {
          score += 4;
        }
      }

      // Keyword matches
      if (analysis.keywords && Array.isArray(analysis.keywords)) {
        const titleLower = listing.title.toLowerCase();
        const brandLower = (listing.brand || '').toLowerCase();
        
        analysis.keywords.forEach((keyword: string) => {
          const keywordLower = keyword.toLowerCase();
          if (titleLower.includes(keywordLower) || brandLower.includes(keywordLower)) {
            score += 2;
          }
        });
      }

      return { ...listing, similarityScore: score };
    });

    // Sort by score and take top results
    const rankedListings = scoredListings
      .filter(l => l.similarityScore > 0)
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, limit);

    console.log(`Found ${rankedListings.length} similar items`);

    return new Response(
      JSON.stringify({
        analysis,
        results: rankedListings,
        count: rankedListings.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in image-search function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
