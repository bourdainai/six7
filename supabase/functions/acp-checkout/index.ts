import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { validateApiKey, checkRateLimit, logApiKeyUsage, corsHeaders } from "../_shared/auth-middleware.ts";

const checkoutSchema = z.object({
  listing_id: z.string().uuid(),
  quantity: z.number().int().min(1).max(1).default(1), // Single item listings
  payment_method: z.enum(['wallet', 'stripe', 'split']).default('stripe'),
  shipping_address: z.object({
    name: z.string().min(1),
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    postal_code: z.string().min(1),
    country: z.string().default('GB'),
  }),
  trade_offer: z.object({
    cash_amount: z.number().min(0).optional(),
    trade_items: z.array(z.string().uuid()).optional(),
  }).optional(),
});

serve(async (req) => {
  const startTime = Date.now();
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate API key
    const authResult = await validateApiKey(req, ['acp_purchase']);
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
    const rateLimitResult = await checkRateLimit(apiKey.id, '/acp/checkout', req.method);
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
    const { listing_id, quantity, payment_method, shipping_address, trade_offer } = checkoutSchema.parse(body);

    // Fetch listing - CRITICAL: Verify ai_answer_engines_enabled = true
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select(`
        id,
        title,
        seller_id,
        seller_price,
        status,
        ai_answer_engines_enabled,
        shipping_cost_uk,
        free_shipping,
        trade_enabled,
        profiles!listings_seller_id_fkey(stripe_connect_account_id, stripe_onboarding_complete)
      `)
      .eq('id', listing_id)
      .single();

    if (listingError || !listing) {
      return new Response(
        JSON.stringify({ error: 'Listing not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // CRITICAL: Verify AI visibility
    if (!listing.ai_answer_engines_enabled) {
      return new Response(
        JSON.stringify({ error: 'This listing is not available for purchase via AI agents' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (listing.status !== 'active') {
      return new Response(
        JSON.stringify({ error: 'Listing is not active' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate seller payment setup
    if (!listing.profiles?.stripe_connect_account_id) {
      return new Response(
        JSON.stringify({ error: 'Seller payment setup incomplete' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate totals
    const productPrice = parseFloat(listing.seller_price || 0);
    const shippingCost = listing.free_shipping ? 0 : parseFloat(listing.shipping_cost_uk || 0);
    const totalAmount = productPrice + shippingCost;

    // Check wallet balance if using wallet payment
    let walletBalance = 0;
    if (payment_method === 'wallet' || payment_method === 'split') {
      const { data: wallet } = await supabase
        .from('wallet_accounts')
        .select('balance')
        .eq('user_id', apiKey.user_id)
        .single();
      
      walletBalance = parseFloat(wallet?.balance || 0);
      
      if (payment_method === 'wallet' && walletBalance < totalAmount) {
        return new Response(
          JSON.stringify({ 
            error: 'Insufficient wallet balance',
            required: totalAmount,
            available: walletBalance,
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Create Stripe PaymentIntent if needed
    let paymentIntentId = null;
    if (payment_method === 'stripe' || payment_method === 'split') {
      const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
        apiVersion: '2023-10-16',
      });

      const stripeAmount = payment_method === 'split' 
        ? Math.max(0, totalAmount - walletBalance)
        : totalAmount;

      if (stripeAmount > 0) {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(stripeAmount * 100), // Convert to pence
          currency: 'gbp',
          metadata: {
            listing_id: listing_id,
            buyer_id: apiKey.user_id,
            seller_id: listing.seller_id,
            session_type: 'acp',
          },
        });

        paymentIntentId = paymentIntent.id;
      }
    }

    // Create ACP session
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes reservation
    const { data: session, error: sessionError } = await supabase
      .from('acp_sessions')
      .insert({
        agent_id: apiKey.user_id,
        status: 'active',
        cart_items: [{ listing_id, quantity }],
        total_amount: totalAmount,
        shipping_address,
        payment_intent_id: paymentIntentId,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Failed to create checkout session', details: sessionError?.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const responseTime = Date.now() - startTime;
    await logApiKeyUsage(apiKey.id, '/acp/checkout', req.method, 200, responseTime);

    return new Response(
      JSON.stringify({
        session_id: session.id,
        total_amount: totalAmount,
        breakdown: {
          product_price: productPrice,
          shipping_cost: shippingCost,
        },
        payment_method,
        wallet_balance: walletBalance,
        payment_intent_id: paymentIntentId,
        expires_at: expiresAt.toISOString(),
        reservation_expires_in_seconds: 900,
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
        await logApiKeyUsage(authResult.apiKey.id, '/acp/checkout', req.method, 500, responseTime);
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
