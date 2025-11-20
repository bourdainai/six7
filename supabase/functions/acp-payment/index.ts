import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { validateApiKey, checkRateLimit, logApiKeyUsage, corsHeaders } from "../_shared/auth-middleware.ts";

const paymentSchema = z.object({
  session_id: z.string().uuid(),
  payment_method_id: z.string().optional(), // For Stripe
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
    const rateLimitResult = await checkRateLimit(apiKey.id, '/acp/payment', req.method);
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
    const { session_id, payment_method_id } = paymentSchema.parse(body);

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

    if (session.status !== 'active') {
      return new Response(
        JSON.stringify({ error: 'Session is not active' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check expiration
    if (session.expires_at && new Date(session.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Session has expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const totalAmount = parseFloat(session.total_amount || 0);
    const cartItems = session.cart_items || [];
    const listingId = cartItems[0]?.listing_id;

    // Process wallet payment if applicable
    let walletTransactionId = null;
    if (session.payment_intent_id) {
      // Check if wallet was used (split payment)
      const { data: wallet } = await supabase
        .from('wallet_accounts')
        .select('balance')
        .eq('user_id', apiKey.user_id)
        .single();

      const walletBalance = parseFloat(wallet?.balance || 0);
      const stripeAmount = Math.max(0, totalAmount - walletBalance);

      if (walletBalance > 0 && walletBalance < totalAmount) {
        // Partial wallet payment
        const { data: walletTx } = await supabase
          .from('wallet_transactions')
          .insert({
            wallet_id: wallet?.id,
            type: 'purchase',
            amount: -walletBalance,
            status: 'completed',
            description: `ACP Purchase: ${listingId}`,
          })
          .select()
          .single();

        walletTransactionId = walletTx?.id;

        // Update wallet balance
        await supabase
          .from('wallet_accounts')
          .update({ balance: 0 })
          .eq('user_id', apiKey.user_id);
      }
    }

    // Process Stripe payment
    let stripeTransactionId = null;
    if (session.payment_intent_id) {
      const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
        apiVersion: '2023-10-16',
      });

      const paymentIntent = await stripe.paymentIntents.confirm(session.payment_intent_id, {
        payment_method: payment_method_id,
      });

      if (paymentIntent.status !== 'succeeded') {
        return new Response(
          JSON.stringify({ error: 'Payment failed', details: paymentIntent.last_payment_error?.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      stripeTransactionId = paymentIntent.id;
    }

    // Update session status
    await supabase
      .from('acp_sessions')
      .update({ status: 'payment_completed', payment_intent_id: stripeTransactionId })
      .eq('id', session_id);

    const responseTime = Date.now() - startTime;
    await logApiKeyUsage(apiKey.id, '/acp/payment', req.method, 200, responseTime);

    return new Response(
      JSON.stringify({
        success: true,
        session_id: session_id,
        payment_confirmed: true,
        transactions: {
          wallet: walletTransactionId,
          stripe: stripeTransactionId,
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
        JSON.stringify({ error: 'Invalid request data', details: error.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    try {
      const authResult = await validateApiKey(req, ['acp_purchase']);
      if (authResult.success && authResult.apiKey) {
        await logApiKeyUsage(authResult.apiKey.id, '/acp/payment', req.method, 500, responseTime);
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
