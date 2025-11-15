import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image, filters, limit = 20 } = await req.json();
    
    if (!image) {
      throw new Error("Image is required for vibe search");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        auth: {
          persistSession: false,
        },
      }
    );

    console.log("Processing vibe search from image");

    // Analyze image to extract style description
    const analysisResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: "You are a fashion expert. Analyze images and describe the style, aesthetic, colors, and vibe in detail for search purposes."
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Describe the fashion style, aesthetic, colors, patterns, and overall vibe of this image in a detailed paragraph. Focus on what makes it unique."
              },
              {
                type: "image_url",
                image_url: { url: image }
              }
            ]
          }
        ]
      }),
    });

    if (!analysisResponse.ok) {
      throw new Error(`Image analysis failed: ${analysisResponse.status}`);
    }

    const analysisData = await analysisResponse.json();
    const styleDescription = analysisData.choices[0].message.content;

    console.log("Style description:", styleDescription);

    // Generate embedding from style description
    const embeddingResponse = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: styleDescription,
      }),
    });

    if (!embeddingResponse.ok) {
      throw new Error(`Embedding generation failed: ${embeddingResponse.status}`);
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    // Build vector similarity search
    let sqlQuery = `
      SELECT 
        l.*,
        le.embedding <=> '[${queryEmbedding.join(',')}]'::vector AS distance,
        (SELECT json_agg(li.image_url) FROM listing_images li WHERE li.listing_id = l.id ORDER BY li.display_order LIMIT 3) as images
      FROM listings l
      JOIN listing_embeddings le ON le.listing_id = l.id
      WHERE l.status = 'active'
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.category) {
      sqlQuery += ` AND l.category = $${paramIndex}`;
      params.push(filters.category);
      paramIndex++;
    }

    if (filters?.minPrice) {
      sqlQuery += ` AND l.seller_price >= $${paramIndex}`;
      params.push(filters.minPrice);
      paramIndex++;
    }

    if (filters?.maxPrice) {
      sqlQuery += ` AND l.seller_price <= $${paramIndex}`;
      params.push(filters.maxPrice);
      paramIndex++;
    }

    sqlQuery += ` ORDER BY distance ASC LIMIT $${paramIndex}`;
    params.push(limit);

    // Execute search
    const { data: results, error: searchError } = await supabaseClient
      .rpc('exec_sql', { 
        query: sqlQuery,
        params: params 
      });

    // If RPC fails, fall back to simple query
    if (searchError) {
      console.error("Vector search error, using fallback:", searchError);
      
      let fallbackQuery = supabaseClient
        .from('listings')
        .select('*, listing_images(image_url)')
        .eq('status', 'active')
        .limit(limit);

      if (filters?.category) fallbackQuery = fallbackQuery.eq('category', filters.category);
      if (filters?.minPrice) fallbackQuery = fallbackQuery.gte('seller_price', filters.minPrice);
      if (filters?.maxPrice) fallbackQuery = fallbackQuery.lte('seller_price', filters.maxPrice);

      const { data: fallbackResults, error: fallbackError } = await fallbackQuery;
      
      if (fallbackError) throw fallbackError;

      return new Response(
        JSON.stringify({ 
          success: true, 
          results: fallbackResults || [],
          styleDescription,
          searchType: 'fallback'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log search
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabaseClient.auth.getUser(token);
        
        if (user) {
          await supabaseClient.from('search_history').insert({
            user_id: user.id,
            search_query: styleDescription.substring(0, 500),
            search_type: 'vibe',
            results_count: results?.length || 0,
            filters_applied: filters || {}
          });
        }
      } catch (e) {
        console.error("Failed to log search:", e);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        results: results || [],
        styleDescription,
        searchType: 'vibe'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error("Vibe search error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
