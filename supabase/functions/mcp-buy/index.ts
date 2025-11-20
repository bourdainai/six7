import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { validateApiKey, checkRateLimit, logApiKeyUsage, corsHeaders } from "../_shared/auth-middleware.ts";

const buySchema = z.object({
  listing_id: z.string().uuid(),
  payment_method: z.enum(['wallet', 'stripe', 'split']),
  shipping_address: z.object({
    name: z.string().min(1),
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    postal_code: z.string().min(1),
    country: z.string().default('GB'),
  }),
});

serve(async (req) => {
  const startTime = Date.now();
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authResult = await validateApiKey(req, ['acp_purchase']);
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
    const rateLimitResult = await checkRateLimit(apiKey.id, '/mcp/buy', req.method);
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

    if (jsonrpc !== '2.0' || method !== 'purchase_item') {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: id || null,
          error: { code: -32601, message: 'Method not found' },
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { listing_id, payment_method, shipping_address } = buySchema.parse(params || {});

    // Verify listing exists and is AI-enabled
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id, seller_id, seller_price, status, ai_answer_engines_enabled, shipping_cost_uk, free_shipping')
      .eq('id', listing_id)
      .single();

    if (listingError || !listing) {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: id || null,
          error: { code: -32004, message: 'Listing not found' },
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!listing.ai_answer_engines_enabled) {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: id || null,
          error: { code: -32006, message: 'This listing is not available for purchase via AI agents' },
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    // Use ACP endpoints to complete purchase
    const totalAmount = parseFloat(listing.seller_price || 0) + (listing.free_shipping ? 0 : parseFloat(listing.shipping_cost_uk || 0));

    // Step 1: Create checkout session
    const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('acp-checkout', {
      body: {
        listing_id: listing_id,
        quantity: 1,
        payment_method: payment_method,
        shipping_address: shipping_address,
      },
      headers: {
        Authorization: req.headers.get('Authorization') || '',
      },
    });

    if (checkoutError || !checkoutData) {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: id || null,
          error: { code: -32603, message: 'Checkout failed', data: checkoutError?.message },
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sessionId = checkoutData.session_id;

    // Step 2: Process payment (if payment_method_id needed, would be passed here)
    const { data: paymentData, error: paymentError } = await supabase.functions.invoke('acp-payment', {
      body: {
        session_id: sessionId,
      },
      headers: {
        Authorization: req.headers.get('Authorization') || '',
      },
    });

    if (paymentError || !paymentData?.success) {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: id || null,
          error: { code: -32603, message: 'Payment failed', data: paymentError?.message },
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Confirm order
    const { data: confirmData, error: confirmError } = await supabase.functions.invoke('acp-confirm', {
      body: {
        session_id: sessionId,
      },
      headers: {
        Authorization: req.headers.get('Authorization') || '',
      },
    });

    if (confirmError || !confirmData?.success) {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: id || null,
          error: { code: -32603, message: 'Order confirmation failed', data: confirmError?.message },
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const responseTime = Date.now() - startTime;
    await logApiKeyUsage(apiKey.id, '/mcp/buy', req.method, 200, responseTime);

    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id: id || null,
        result: {
          order_id: confirmData.order_id,
          status: 'completed',
          total_amount: totalAmount,
          tracking_number: confirmData.tracking_number || null,
          message: 'Purchase completed successfully',
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
      const authResult = await validateApiKey(req, ['acp_purchase']);
      if (authResult.success && authResult.apiKey) {
        await logApiKeyUsage(authResult.apiKey.id, '/mcp/buy', req.method, 500, responseTime);
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
