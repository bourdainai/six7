import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { validateApiKey, checkRateLimit, logApiKeyUsage, corsHeaders } from "../_shared/auth-middleware.ts";

const getListingSchema = z.object({
  listing_id: z.string().uuid(),
});

serve(async (req) => {
  const startTime = Date.now();
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authResult = await validateApiKey(req, ['mcp_search']);
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
    const rateLimitResult = await checkRateLimit(apiKey.id, '/mcp/get-listing', req.method);
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

    if (jsonrpc !== '2.0' || method !== 'get_listing') {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: id || null,
          error: { code: -32601, message: 'Method not found' },
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { listing_id } = getListingSchema.parse(params || {});

    // Fetch listing - CRITICAL: Verify ai_answer_engines_enabled = true
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select(`
        id,
        title,
        description,
        seller_id,
        seller_price,
        condition,
        set_code,
        card_number,
        rarity,
        grading_service,
        grading_score,
        video_url,
        trade_enabled,
        shipping_cost_uk,
        free_shipping,
        status,
        created_at,
        updated_at,
        listing_images(image_url, display_order),
        profiles!listings_seller_id_fkey(id, full_name, trust_score)
      `)
      .eq('id', listing_id)
      .eq('ai_answer_engines_enabled', true) // CRITICAL FILTER
      .single();

    if (listingError || !listing) {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: id || null,
          error: { 
            code: -32004, 
            message: 'Listing not found or not available via MCP',
            data: 'This listing may not be enabled for AI agents, or it does not exist.'
          },
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (listing.status !== 'active') {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: id || null,
          error: { code: -32005, message: 'Listing is not active' },
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const images = (listing.listing_images || [])
      .sort((a: any, b: any) => a.display_order - b.display_order)
      .map((img: any) => img.image_url);

    const responseTime = Date.now() - startTime;
    await logApiKeyUsage(apiKey.id, '/mcp/get-listing', req.method, 200, responseTime);

    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id: id || null,
        result: {
          listing: {
            id: listing.id,
            title: listing.title,
            description: listing.description || '',
            price: parseFloat(listing.seller_price || 0),
            condition: listing.condition || 'Unknown',
            set: listing.set_code || '',
            rarity: listing.rarity || '',
            grading: listing.grading_service && listing.grading_score ? {
              service: listing.grading_service,
              score: listing.grading_score,
            } : null,
            images,
            video: listing.video_url || null,
            seller: {
              id: listing.seller_id,
              name: listing.profiles?.full_name || 'Anonymous',
              trust_score: listing.profiles?.trust_score || 50,
            },
            trade_enabled: listing.trade_enabled || false,
            shipping: {
              cost: listing.free_shipping ? 0 : parseFloat(listing.shipping_cost_uk || 0),
              free: listing.free_shipping,
            },
            created_at: listing.created_at,
            updated_at: listing.updated_at,
          },
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
        await logApiKeyUsage(authResult.apiKey.id, '/mcp/get-listing', req.method, 500, responseTime);
      }
    } catch {}

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

