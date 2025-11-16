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
    const { query, filters = {}, limit = 20 } = await req.json();

    if (!query || query.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Search query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build the query
    let dbQuery = supabase
      .from('listings')
      .select(`
        *,
        listing_images!listing_images_listing_id_fkey(image_url, display_order),
        profiles!listings_seller_id_fkey(full_name, avatar_url)
      `)
      .eq('status', 'active');

    // Apply filters
    if (filters.category) {
      dbQuery = dbQuery.eq('category', filters.category);
    }
    if (filters.condition) {
      dbQuery = dbQuery.eq('condition', filters.condition);
    }
    if (filters.minPrice) {
      dbQuery = dbQuery.gte('seller_price', filters.minPrice);
    }
    if (filters.maxPrice) {
      dbQuery = dbQuery.lte('seller_price', filters.maxPrice);
    }
    if (filters.brand) {
      dbQuery = dbQuery.ilike('brand', `%${filters.brand}%`);
    }
    if (filters.size) {
      dbQuery = dbQuery.eq('size', filters.size);
    }

    // Use full-text search with ranking
    const searchQuery = query.trim().replace(/[^\w\s]/g, '').split(/\s+/).join(' & ');
    
    const { data, error } = await dbQuery
      .textSearch('search_vector', searchQuery, {
        type: 'websearch',
        config: 'english'
      })
      .limit(limit);

    if (error) {
      console.error('Keyword search error:', error);
      throw error;
    }

    // Track search analytics
    const authHeader = req.headers.get('Authorization');
    let userId = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    await supabase.from('search_analytics').insert({
      query,
      search_type: 'keyword',
      user_id: userId,
      results_count: data?.length || 0
    });

    return new Response(
      JSON.stringify({ 
        results: data || [],
        searchType: 'keyword',
        count: data?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in keyword-search:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
