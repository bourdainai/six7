import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { validateApiKey, checkRateLimit, logApiKeyUsage, corsHeaders } from "../_shared/auth-middleware.ts";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  condition: z.string().optional(),
  set_code: z.string().optional(),
  rarity: z.string().optional(),
  min_price: z.coerce.number().min(0).optional(),
  max_price: z.coerce.number().min(0).optional(),
});

serve(async (req) => {
  const startTime = Date.now();
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate API key
    const authResult = await validateApiKey(req, ['acp_read']);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { 
          status: authResult.statusCode || 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const apiKey = authResult.apiKey!;

    // Check rate limits
    const rateLimitResult = await checkRateLimit(apiKey.id, '/acp/products', req.method);
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded',
          retry_after: rateLimitResult.retryAfter 
        }),
        { 
          status: 429,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': rateLimitResult.retryAfter?.toString() || '3600',
            'X-RateLimit-Limit': apiKey.rate_limit_per_hour.toString(),
            'X-RateLimit-Remaining': '0',
          } 
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse query parameters
    const url = new URL(req.url);
    const queryParams: any = {};
    url.searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    const { limit, offset, condition, set_code, rarity, min_price, max_price } = querySchema.parse(queryParams);

    // Build query - CRITICAL: Only show listings where ai_answer_engines_enabled = true
    let query = supabase
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
        grading_service,
        grading_score,
        video_url,
        trade_enabled,
        shipping_cost_uk,
        free_shipping,
        status,
        created_at,
        listing_images(image_url, display_order)
      `)
      .eq('status', 'active')
      .eq('ai_answer_engines_enabled', true) // CRITICAL FILTER
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (condition) {
      query = query.eq('condition', condition);
    }
    if (set_code) {
      query = query.eq('set_code', set_code);
    }
    if (rarity) {
      query = query.eq('rarity', rarity);
    }
    if (min_price !== undefined) {
      query = query.gte('seller_price', min_price);
    }
    if (max_price !== undefined) {
      query = query.lte('seller_price', max_price);
    }

    const { data: listings, error, count } = await query;

    if (error) {
      throw error;
    }

    // Format response per ACP spec
    const products = (listings || []).map((listing: any) => {
      const images = (listing.listing_images || [])
        .sort((a: any, b: any) => a.display_order - b.display_order)
        .map((img: any) => img.image_url);

      return {
        id: listing.id,
        title: listing.title,
        description: listing.description || '',
        condition: listing.condition || 'Unknown',
        set_data: listing.set_code ? {
          code: listing.set_code,
          number: listing.card_number || '',
        } : null,
        rarity: listing.rarity || '',
        grading: listing.grading_service && listing.grading_score ? {
          service: listing.grading_service,
          score: listing.grading_score,
        } : null,
        price: parseFloat(listing.seller_price || 0),
        currency: 'GBP',
        images,
        video: listing.video_url || null,
        seller_id: listing.seller_id,
        stock: 1, // Single item listings
        trade_enabled: listing.trade_enabled || false,
        shipping_options: [
          {
            carrier: 'Royal Mail',
            cost: listing.free_shipping ? 0 : (parseFloat(listing.shipping_cost_uk || 0)),
            estimated_days: 3,
            region: 'UK',
          },
        ],
        created_at: listing.created_at,
      };
    });

    const responseTime = Date.now() - startTime;

    // Log usage
    await logApiKeyUsage(apiKey.id, '/acp/products', req.method, 200, responseTime);

    // Calculate remaining rate limit
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const { count: hourlyUsage } = await supabase
      .from('api_key_usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('api_key_id', apiKey.id)
      .gte('created_at', oneHourAgo.toISOString());

    return new Response(
      JSON.stringify({
        products,
        pagination: {
          limit,
          offset,
          total: count || products.length,
          has_more: (count || products.length) > offset + limit,
        },
        meta: {
          execution_time_ms: responseTime,
          rate_limit: {
            limit: apiKey.rate_limit_per_hour,
            remaining: Math.max(0, apiKey.rate_limit_per_hour - (hourlyUsage || 0) - 1),
            reset_at: new Date(Date.now() + 3600 * 1000).toISOString(),
          },
        },
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': apiKey.rate_limit_per_hour.toString(),
          'X-RateLimit-Remaining': Math.max(0, apiKey.rate_limit_per_hour - (hourlyUsage || 0) - 1).toString(),
        },
      }
    );
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    // Try to log error if we have API key context
    try {
      const authResult = await validateApiKey(req, ['acp_read']);
      if (authResult.success && authResult.apiKey) {
        await logApiKeyUsage(authResult.apiKey.id, '/acp/products', req.method, 500, responseTime);
      }
    } catch {}

    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
