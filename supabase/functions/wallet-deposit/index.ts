import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
// import Stripe from "https://esm.sh/stripe@13.10.0?target=deno"; // Placeholder for Stripe import

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const depositSchema = z.object({
  amount: z.number().positive('Amount must be positive').max(100000, 'Amount too large'),
  currency: z.enum(['gbp', 'usd', 'eur']).default('gbp')
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
    
    // Mock Stripe for now to avoid import errors if not set up
    const Stripe = (key: string) => ({
      paymentIntents: {
        create: async (params: any) => ({
          id: `pi_mock_${Math.random().toString(36).substring(7)}`,
          client_secret: `secret_mock_${Math.random().toString(36).substring(7)}`,
          amount: params.amount,
          currency: params.currency,
        })
      }
    });

    const stripe = Stripe(stripeKey);
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { amount, currency } = depositSchema.parse(body);
    
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    console.log(`Creating deposit for user ${user.id}, amount: ${amount}`);

    // Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents/pence
      currency: currency.toLowerCase(),
      metadata: {
        user_id: user.id,
        type: 'wallet_deposit'
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Get or create wallet
    let { data: wallet } = await supabase
      .from('wallet_accounts')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!wallet) {
      const { data: newWallet, error: walletError } = await supabase
        .from('wallet_accounts')
        .insert({ user_id: user.id })
        .select('id')
        .single();
      
      if (walletError) throw walletError;
      wallet = newWallet;
    }

    // Record pending deposit
    const { error: depositError } = await supabase
      .from('wallet_deposits')
      .insert({
        wallet_id: wallet.id,
        amount: amount,
        stripe_payment_intent_id: paymentIntent.id,
        status: 'pending'
      });

    if (depositError) throw depositError;

    return new Response(
      JSON.stringify({ 
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

