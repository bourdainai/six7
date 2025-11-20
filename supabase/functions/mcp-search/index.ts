import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { validateApiKey, checkRateLimit, logApiKeyUsage, corsHeaders } from "../_shared/auth-middleware.ts";

const searchSchema = z.object({
  query: z.string().min(1),
  filters: z.object({
    condition: z.string().optional(),
    rarity: z.string().optional(),
    set: z.string().optional(),
    min_price: z.number().optional(),
    max_price: z.number().optional(),
  }).optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

serve(async (req) => {
  const startTime = Date.now();

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate API key
    const authResult = await validateApiKey(req, ['mcp_search']);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: null,
          error: { code: -32000, message: authResult.error },
        }),
        {
          status: authResult.statusCode || 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const apiKey = authResult.apiKey!;

    // Check rate limits
    const rateLimitResult = await checkRateLimit(apiKey.id, '/mcp/search', req.method);
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: null,
          error: { code: -32001, message: 'Rate limit exceeded', data: { retry_after: rateLimitResult.retryAfter } },
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse JSON-RPC 2.0 request
    const body = await req.json();
    const { jsonrpc, id, method, params } = body;

    if (jsonrpc !== '2.0' || method !== 'search_listings') {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: id || null,
          error: { code: -32601, message: 'Method not found' },
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { query, filters, limit } = searchSchema.parse(params || {});

    // Build search query - CRITICAL: Only search listings where ai_answer_engines_enabled = true
    let dbQuery = supabase
      .from('listings')
      .select(`
        id,
        title,
        description,
        seller_price,
        condition,
        set_code,
        card_number,
        rarity,
        status,
        listing_images(image_url, display_order),
        profiles!listings_seller_id_fkey(full_name)
      `)
      .eq('status', 'active')
      .eq('ai_answer_engines_enabled', true) // CRITICAL FILTER
      .limit(limit);

    // Apply text search
    if (query) {
      dbQuery = dbQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%,set_code.ilike.%${query}%`);
    }

    // Apply filters
    if (filters?.condition) {
      dbQuery = dbQuery.eq('condition', filters.condition);
    }
    if (filters?.rarity) {
      dbQuery = dbQuery.eq('rarity', filters.rarity);
    }
    if (filters?.set) {
      dbQuery = dbQuery.eq('set_code', filters.set);
    }
    if (filters?.min_price !== undefined) {
      dbQuery = dbQuery.gte('seller_price', filters.min_price);
    }
    if (filters?.max_price !== undefined) {
      dbQuery = dbQuery.lte('seller_price', filters.max_price);
    }

    const { data: listings, error, count } = await dbQuery;

    if (error) {
      throw error;
    }

    // Format results
    const results = (listings || []).map((listing: any) => {
      const images = (listing.listing_images || [])
        .sort((a: any, b: any) => a.display_order - b.display_order)
        .map((img: any) => img.image_url);

      return {
        id: listing.id,
        title: listing.title,
        price: parseFloat(listing.seller_price || 0),
        condition: listing.condition || 'Unknown',
        set: listing.set_code || '',
        rarity: listing.rarity || '',
        seller: listing.profiles?.full_name || 'Anonymous',
        images: images.slice(0, 1), // First image only for search results
      };
    });

    const responseTime = Date.now() - startTime;
    await logApiKeyUsage(apiKey.id, '/mcp/search', req.method, 200, responseTime);

    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id: id || null,
        result: {
          results,
          total: count || results.length,
          execution_time_ms: responseTime,
        },
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    const responseTime = Date.now() - startTime;

    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: null,
          error: { code: -32602, message: 'Invalid params', data: error.errors },
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    try {
      const authResult = await validateApiKey(req, ['mcp_search']);
      if (authResult.success && authResult.apiKey) {
        await logApiKeyUsage(authResult.apiKey.id, '/mcp/search', req.method, 500, responseTime);
      }
    } catch (e) {
      console.error('Error logging API usage:', e);
    }

    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32603, message: 'Internal error', data: error instanceof Error ? error.message : 'Unknown error' },
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
