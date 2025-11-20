import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { validateApiKey, checkRateLimit, logApiKeyUsage, corsHeaders } from "../_shared/auth-middleware.ts";

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
    const rateLimitResult = await checkRateLimit(apiKey.id, '/acp/product', req.method);
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
          }
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract product ID from URL
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const productId = pathParts[pathParts.length - 1];

    if (!productId || productId === 'product') {
      return new Response(
        JSON.stringify({ error: 'Product ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch listing with all relations - CRITICAL: Verify ai_answer_engines_enabled = true
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
      .eq('id', productId)
      .eq('ai_answer_engines_enabled', true) // CRITICAL: Only return if AI-enabled
      .single();

    if (listingError || !listing) {
      return new Response(
        JSON.stringify({
          error: 'Product not found or not available via ACP',
          details: 'This listing may not be enabled for AI agents, or it does not exist.'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (listing.status !== 'active') {
      return new Response(
        JSON.stringify({ error: 'Product is not active' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get seller reputation
    const { data: reputation } = await supabase
      .from('seller_reputation')
      .select('trust_score, total_sales, positive_reviews')
      .eq('seller_id', listing.seller_id)
      .single();

    // Get comparable sales (recent sales of similar cards)
    const { data: comps } = await supabase
      .from('pricing_comps')
      .select('price, condition, date_sold, source')
      .eq('card_id', listing.card_id || '')
      .order('date_sold', { ascending: false })
      .limit(10);

    // Format images
    const images = (listing.listing_images || [])
      .sort((a: any, b: any) => a.display_order - b.display_order)
      .map((img: any) => img.image_url);

    // Format response per ACP spec
    const product = {
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
      seller: {
        id: listing.seller_id,
        name: listing.profiles?.full_name || 'Anonymous',
        trust_score: listing.profiles?.trust_score || 50,
        reputation: reputation ? {
          trust_score: reputation.trust_score,
          total_sales: reputation.total_sales || 0,
          positive_reviews: reputation.positive_reviews || 0,
        } : null,
      },
      stock: 1,
      trade_enabled: listing.trade_enabled || false,
      shipping_options: [
        {
          carrier: 'Royal Mail',
          cost: listing.free_shipping ? 0 : (parseFloat(listing.shipping_cost_uk || 0)),
          estimated_days: 3,
          region: 'UK',
        },
      ],
      comparable_sales: (comps || []).map((comp: any) => ({
        price: parseFloat(comp.price || 0),
        condition: comp.condition,
        date_sold: comp.date_sold,
        source: comp.source,
      })),
      created_at: listing.created_at,
      updated_at: listing.updated_at,
    };

    const responseTime = Date.now() - startTime;

    // Log usage
    await logApiKeyUsage(apiKey.id, '/acp/product', req.method, 200, responseTime);

    return new Response(
      JSON.stringify({
        product,
        meta: {
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

    try {
      const authResult = await validateApiKey(req, ['acp_read']);
      if (authResult.success && authResult.apiKey) {
        await logApiKeyUsage(authResult.apiKey.id, '/acp/product', req.method, 500, responseTime);
      }
    } catch (e) {
      console.error('Error logging API usage:', e);
    }

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
