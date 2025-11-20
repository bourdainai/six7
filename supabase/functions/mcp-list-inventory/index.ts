import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { validateApiKey, checkRateLimit, logApiKeyUsage, corsHeaders } from "../_shared/auth-middleware.ts";

const listInventorySchema = z.object({
  status: z.enum(['active', 'inactive', 'sold', 'all']).default('all'),
  limit: z.number().int().min(1).max(100).default(50),
});

serve(async (req) => {
  const startTime = Date.now();

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authResult = await validateApiKey(req, ['mcp_listing']);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: null,
          error: { code: -32000, message: authResult.error },
        }),
        { status: authResult.statusCode || 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = authResult.apiKey!;
    const rateLimitResult = await checkRateLimit(apiKey.id, '/mcp/list-inventory', req.method);
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: null,
          error: { code: -32001, message: 'Rate limit exceeded' },
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { jsonrpc, id, method, params } = body;

    if (jsonrpc !== '2.0' || method !== 'list_inventory') {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: id || null,
          error: { code: -32601, message: 'Method not found' },
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { status, limit } = listInventorySchema.parse(params || {});

    // Build query
    let query = supabase
      .from('listings')
      .select(`
        id,
        title,
        seller_price,
        status,
        views,
        saves,
        created_at,
        updated_at,
        ai_answer_engines_enabled,
        listing_images(image_url, display_order)
      `)
      .eq('seller_id', apiKey.user_id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: listings, error, count } = await query;

    if (error) {
      throw error;
    }

    // Format results
    const inventory = (listings || []).map((listing: any) => {
      const images = (listing.listing_images || [])
        .sort((a: any, b: any) => a.display_order - b.display_order)
        .map((img: any) => img.image_url);

      return {
        id: listing.id,
        title: listing.title,
        price: parseFloat(listing.seller_price || 0),
        status: listing.status,
        views: listing.views || 0,
        saves: listing.saves || 0,
        ai_answer_engines_enabled: listing.ai_answer_engines_enabled || false,
        images: images.slice(0, 1), // First image only
        created_at: listing.created_at,
        updated_at: listing.updated_at,
      };
    });

    const responseTime = Date.now() - startTime;
    await logApiKeyUsage(apiKey.id, '/mcp/list-inventory', req.method, 200, responseTime);

    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id: id || null,
        result: {
          items: inventory,
          total: count || inventory.length,
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
      const authResult = await validateApiKey(req, ['mcp_listing']);
      if (authResult.success && authResult.apiKey) {
        await logApiKeyUsage(authResult.apiKey.id, '/mcp/list-inventory', req.method, 500, responseTime);
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
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
