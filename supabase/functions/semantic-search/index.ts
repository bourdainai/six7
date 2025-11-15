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
    const { query, filters, limit = 20 } = await req.json();
    
    if (!query) {
      throw new Error("Search query is required");
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

    console.log(`Semantic search for: "${query}"`);

    // Generate embedding for search query
    const embeddingResponse = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: query,
      }),
    });

    if (!embeddingResponse.ok) {
      throw new Error(`Embedding generation failed: ${embeddingResponse.status}`);
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    // Build SQL query for vector similarity search
    let sqlQuery = `
      SELECT 
        l.*,
        le.embedding <=> '[${queryEmbedding.join(',')}]'::vector AS distance,
        (SELECT json_agg(li.image_url) FROM listing_images li WHERE li.listing_id = l.id ORDER BY li.display_order LIMIT 3) as images
      FROM listings l
      JOIN listing_embeddings le ON le.listing_id = l.id
      WHERE l.status = 'active'
    `;

    // Apply filters
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

    if (filters?.brand) {
      sqlQuery += ` AND l.brand ILIKE $${paramIndex}`;
      params.push(`%${filters.brand}%`);
      paramIndex++;
    }

    if (filters?.color) {
      sqlQuery += ` AND l.color ILIKE $${paramIndex}`;
      params.push(`%${filters.color}%`);
      paramIndex++;
    }

    if (filters?.size) {
      sqlQuery += ` AND l.size ILIKE $${paramIndex}`;
      params.push(`%${filters.size}%`);
      paramIndex++;
    }

    if (filters?.condition) {
      sqlQuery += ` AND l.condition = $${paramIndex}`;
      params.push(filters.condition);
      paramIndex++;
    }

    sqlQuery += ` ORDER BY distance ASC LIMIT $${paramIndex}`;
    params.push(limit);

    // Execute vector similarity search
    const { data: results, error: searchError } = await supabaseClient
      .rpc('exec_sql', { 
        query: sqlQuery,
        params: params 
      });

    if (searchError) {
      console.error("Search error:", searchError);
      // Fallback to regular search if vector search fails
      let fallbackQuery = supabaseClient
        .from('listings')
        .select('*, listing_images(image_url)')
        .eq('status', 'active')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%,brand.ilike.%${query}%`)
        .limit(limit);

      if (filters?.category) fallbackQuery = fallbackQuery.eq('category', filters.category);
      if (filters?.minPrice) fallbackQuery = fallbackQuery.gte('seller_price', filters.minPrice);
      if (filters?.maxPrice) fallbackQuery = fallbackQuery.lte('seller_price', filters.maxPrice);
      if (filters?.brand) fallbackQuery = fallbackQuery.ilike('brand', `%${filters.brand}%`);

      const { data: fallbackResults, error: fallbackError } = await fallbackQuery;
      
      if (fallbackError) throw fallbackError;

      return new Response(
        JSON.stringify({ 
          success: true, 
          results: fallbackResults || [],
          searchType: 'fallback',
          query 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log search for learning
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabaseClient.auth.getUser(token);
        
        if (user) {
          await supabaseClient.from('search_history').insert({
            user_id: user.id,
            search_query: query,
            search_type: 'semantic',
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
        searchType: 'semantic',
        query 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error("Semantic search error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
