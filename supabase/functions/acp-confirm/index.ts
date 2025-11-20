import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { validateApiKey, checkRateLimit, logApiKeyUsage, corsHeaders } from "../_shared/auth-middleware.ts";

const confirmSchema = z.object({
  session_id: z.string().uuid(),
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
        JSON.stringify({ error: authResult.error }),
        { status: authResult.statusCode || 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = authResult.apiKey!;
    const rateLimitResult = await checkRateLimit(apiKey.id, '/acp/confirm', req.method);
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded', retry_after: rateLimitResult.retryAfter }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { session_id } = confirmSchema.parse(body);

    // Fetch session
    const { data: session, error: sessionError } = await supabase
      .from('acp_sessions')
      .select('*')
      .eq('id', session_id)
      .eq('agent_id', apiKey.user_id)
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Session not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (session.status !== 'payment_completed') {
      return new Response(
        JSON.stringify({ error: 'Payment must be completed before confirming order' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cartItems = session.cart_items || [];
    const listingId = cartItems[0]?.listing_id;

    // Verify listing still exists and is active
    const { data: listing } = await supabase
      .from('listings')
      .select('id, seller_id, status, seller_price')
      .eq('id', listingId)
      .single();

    if (!listing || listing.status !== 'active') {
      return new Response(
        JSON.stringify({ error: 'Listing is no longer available' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        buyer_id: apiKey.user_id,
        seller_id: listing.seller_id,
        total_amount: session.total_amount,
        shipping_address: session.shipping_address,
        status: 'confirmed',
        payment_method: 'acp',
      })
      .select()
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: 'Failed to create order', details: orderError?.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create order items
    await supabase.from('order_items').insert({
      order_id: order.id,
      listing_id: listingId,
      quantity: 1,
      price: parseFloat(listing.seller_price || 0),
    });

    // Update listing status to sold
    await supabase
      .from('listings')
      .update({ status: 'sold' })
      .eq('id', listingId);

    // Generate shipping label (call existing function)
    try {
      await supabase.functions.invoke('shipping-create-label', {
        body: {
          order_id: order.id,
          shipping_address: session.shipping_address,
        },
      });
    } catch (e) {
      console.error('Failed to generate shipping label:', e);
      // Continue - label can be generated later
    }

    // Update session status
    await supabase
      .from('acp_sessions')
      .update({ status: 'completed' })
      .eq('id', session_id);

    // Send notifications (async - don't wait)
    supabase.functions.invoke('send-notification', {
      body: {
        user_id: listing.seller_id,
        type: 'order_received',
        title: 'New Order Received',
        message: `Order #${order.id} has been placed`,
      },
    }).catch(() => { });

    const responseTime = Date.now() - startTime;
    await logApiKeyUsage(apiKey.id, '/acp/confirm', req.method, 200, responseTime);

    return new Response(
      JSON.stringify({
        success: true,
        order_id: order.id,
        status: 'confirmed',
        tracking_number: null, // Will be added when label is generated
        message: 'Order confirmed successfully',
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
        JSON.stringify({ error: 'Invalid request data', details: error.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    try {
      const authResult = await validateApiKey(req, ['acp_purchase']);
      if (authResult.success && authResult.apiKey) {
        await logApiKeyUsage(authResult.apiKey.id, '/acp/confirm', req.method, 500, responseTime);
      }
    } catch (e) {
      console.error('Error logging API usage:', e);
    }

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
