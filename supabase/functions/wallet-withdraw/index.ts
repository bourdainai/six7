import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const withdrawSchema = z.object({
  amount: z.number().min(1, 'Minimum withdrawal is £1').max(10000, 'Maximum withdrawal is £10,000'),
  bank_account_id: z.string().min(1, 'Bank account is required'),
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
    const { amount, bank_account_id } = withdrawSchema.parse(body);
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    console.log(`Processing withdrawal for user ${user.id}, amount: ${amount}`);

    // Get wallet and check balance
    const { data: wallet, error: walletError } = await supabase
      .from('wallet_accounts')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet) throw new Error('Wallet not found');
    if (wallet.balance < amount) throw new Error('Insufficient funds');

    // Get user's profile to get Stripe Connect account
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_connect_account_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.stripe_connect_account_id) {
      throw new Error('No Stripe Connect account found. Please complete seller onboarding first.');
    }

    console.log(`Processing withdrawal for user ${user.id} to bank account ${bank_account_id}`);

    // Verify the bank account belongs to this user's Stripe Connect account
    const account = await stripe.accounts.retrieve(profile.stripe_connect_account_id);
    const externalAccounts = await stripe.accounts.listExternalAccounts(
      profile.stripe_connect_account_id,
      { object: 'bank_account', limit: 100 }
    );
    
    const bankAccount = externalAccounts.data.find((acct: any) => acct.id === bank_account_id);
    if (!bankAccount) {
      throw new Error('Invalid bank account selected');
    }

    // Deduct from wallet balance first
    const { error: updateError } = await supabase
      .from('wallet_accounts')
      .update({ balance: wallet.balance - amount })
      .eq('id', wallet.id);

    if (updateError) throw updateError;

    // Create Stripe payout to the selected bank account
    const payout = await stripe.payouts.create(
      {
        amount: Math.round(amount * 100),
        currency: 'gbp',
        method: 'standard',
        destination: bank_account_id,
        metadata: {
          user_id: user.id,
          wallet_id: wallet.id,
          type: 'wallet_withdrawal'
        }
      },
      {
        stripeAccount: profile.stripe_connect_account_id,
      }
    );

    // Record withdrawal
    await supabase.from('wallet_withdrawals').insert({
      wallet_id: wallet.id,
      amount: amount,
      stripe_transfer_id: payout.id,
      status: 'pending'
    });

    // Record transaction log
    await supabase.from('wallet_transactions').insert({
      wallet_id: wallet.id,
      type: 'withdrawal',
      amount: -amount,
      balance_after: wallet.balance - amount,
      stripe_transaction_id: payout.id,
      status: 'pending',
      description: `Withdrawal to bank account ending in ${(bankAccount as any).last4}`
    });

    console.log(`Withdrawal successful: ${payout.id}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        payoutId: payout.id 
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

