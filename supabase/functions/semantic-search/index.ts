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
    const { query, filters, limit = 20, forceMode } = await req.json();
    
    if (!query) {
      throw new Error("Search query is required");
    }

    // Smart routing: Determine if query needs semantic search or keyword search
    const wordCount = query.trim().split(/\s+/).length;
    const hasDescriptiveWords = /cozy|comfortable|elegant|stylish|vintage|modern|casual|formal|trendy|chic|sophisticated|minimalist/i.test(query);
    const isSimpleQuery = wordCount <= 2 && !hasDescriptiveWords;

    // If it's a simple query and not forced to use semantic, route to keyword search
    if (isSimpleQuery && forceMode !== 'semantic') {
      return new Response(
        JSON.stringify({ 
          routeTo: 'keyword',
          message: 'Simple query detected, routing to keyword search for faster results'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
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

    // Generate embedding for search query using OpenAI
    const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
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
        .limit(limit);

      // Apply filters to fallback
      if (filters?.category) {
        fallbackQuery = fallbackQuery.eq('category', filters.category);
      }
      if (filters?.minPrice) {
        fallbackQuery = fallbackQuery.gte('seller_price', filters.minPrice);
      }
      if (filters?.maxPrice) {
        fallbackQuery = fallbackQuery.lte('seller_price', filters.maxPrice);
      }
      if (filters?.brand) {
        fallbackQuery = fallbackQuery.ilike('brand', `%${filters.brand}%`);
      }
      if (filters?.condition) {
        fallbackQuery = fallbackQuery.eq('condition', filters.condition);
      }

      const { data: fallbackResults, error: fallbackError } = await fallbackQuery;
      
      if (fallbackError) {
        throw fallbackError;
      }

      console.log(`Fallback search returned ${fallbackResults?.length || 0} results`);
      
      // Track search analytics
      const authHeader = req.headers.get('Authorization');
      let userId = null;
      
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabaseClient.auth.getUser(token);
        userId = user?.id || null;
        
        if (user) {
          await supabaseClient.from('search_history').insert({
            user_id: user.id,
            search_query: query,
            search_type: 'semantic',
            results_count: fallbackResults?.length || 0,
            filters_applied: filters
          });
        }
      }

      await supabaseClient.from('search_analytics').insert({
        query,
        search_type: 'semantic_fallback',
        user_id: userId,
        results_count: fallbackResults?.length || 0
      });

      return new Response(
        JSON.stringify({ 
          results: fallbackResults || [],
          searchType: 'semantic_fallback'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Vector search returned ${results?.length || 0} results`);

    // Track search analytics
    const authHeader = req.headers.get('Authorization');
    let userId = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabaseClient.auth.getUser(token);
      userId = user?.id || null;
      
      if (user) {
        await supabaseClient.from('search_history').insert({
          user_id: user.id,
          search_query: query,
          search_type: 'semantic',
          results_count: results?.length || 0,
          filters_applied: filters
        });
      }
    }

    await supabaseClient.from('search_analytics').insert({
      query,
      search_type: 'semantic',
      user_id: userId,
      results_count: results?.length || 0
    });

    return new Response(
      JSON.stringify({ 
        results: results || [],
        searchType: 'semantic'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in semantic-search function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An error occurred during search'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
