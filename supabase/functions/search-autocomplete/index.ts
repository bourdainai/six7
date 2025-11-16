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
    const { query, limit = 10 } = await req.json();

    if (!query || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ suggestions: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const suggestions = [];

    // Get popular searches (last 30 days)
    const { data: popularSearches } = await supabase
      .from('search_analytics')
      .select('query')
      .ilike('query', `${query}%`)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .limit(5);

    if (popularSearches) {
      const uniqueQueries = [...new Set(popularSearches.map((s: any) => s.query))];
      suggestions.push(...uniqueQueries.map(q => ({
        type: 'popular',
        text: q,
        icon: '🔥'
      })));
    }

    // Get matching brands using trigram similarity
    const { data: brands } = await supabase
      .from('listings')
      .select('brand')
      .not('brand', 'is', null)
      .textSearch('brand', query, { type: 'websearch' })
      .limit(3);

    if (brands) {
      const uniqueBrands = [...new Set(brands.map(b => b.brand))];
      suggestions.push(...uniqueBrands.map(brand => ({
        type: 'brand',
        text: brand,
        icon: '🏷️'
      })));
    }

    // Get matching categories
    const { data: categories } = await supabase
      .from('listings')
      .select('category')
      .not('category', 'is', null)
      .ilike('category', `%${query}%`)
      .limit(3);

    if (categories) {
      const uniqueCategories = [...new Set(categories.map(c => c.category))];
      suggestions.push(...uniqueCategories.map(category => ({
        type: 'category',
        text: category,
        icon: '📁'
      })));
    }

    // Get trending items (most viewed in last 7 days)
    const { data: trending } = await supabase
      .from('listings')
      .select('title, views')
      .eq('status', 'active')
      .ilike('title', `%${query}%`)
      .order('views', { ascending: false })
      .limit(3);

    if (trending) {
      suggestions.push(...trending.map(item => ({
        type: 'trending',
        text: item.title,
        icon: '📈'
      })));
    }

    // Remove duplicates and limit
    const uniqueSuggestions = Array.from(
      new Map(suggestions.map(s => [s.text.toLowerCase(), s])).values()
    ).slice(0, limit);

    return new Response(
      JSON.stringify({ suggestions: uniqueSuggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in search-autocomplete:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
