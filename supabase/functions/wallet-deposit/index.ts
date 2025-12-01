import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";

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
    
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    });
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

    // Get or create wallet
    let { data: wallet } = await supabase
      .from('wallet_accounts')
      .select('id, pending_balance')
      .eq('user_id', user.id)
      .single();

    if (!wallet) {
      const { data: newWallet, error: walletError } = await supabase
        .from('wallet_accounts')
        .insert({ 
          user_id: user.id,
          balance: 0,
          pending_balance: 0
        })
        .select('id, pending_balance')
        .single();
      
      if (walletError) throw walletError;
      wallet = newWallet;
    }

    // Create deposit record first
    const { data: deposit, error: depositError } = await supabase
      .from('wallet_deposits')
      .insert({
        wallet_id: wallet.id,
        amount: amount,
        currency: currency,
        status: 'pending'
      })
      .select('id')
      .single();

    if (depositError || !deposit) {
      throw new Error('Failed to create deposit record');
    }

    // Update pending balance
    await supabase
      .from('wallet_accounts')
      .update({
        pending_balance: (Number(wallet.pending_balance) || 0) + amount
      })
      .eq('id', wallet.id);

    // Create Stripe PaymentIntent with deposit metadata
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents/pence
      currency: currency.toLowerCase(),
      metadata: {
        type: 'wallet_deposit',
        deposit_id: deposit.id,
        user_id: user.id,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Update deposit with payment intent ID
    await supabase
      .from('wallet_deposits')
      .update({
        stripe_payment_intent_id: paymentIntent.id
      })
      .eq('id', deposit.id);

    return new Response(
      JSON.stringify({ 
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        depositId: deposit.id
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

