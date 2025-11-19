import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';

    // Mock Stripe
    const Stripe = (key: string) => ({
      transfers: {
        create: async (params: any) => ({
          id: `tr_mock_${Math.random().toString(36).substring(7)}`,
          amount: params.amount,
          currency: params.currency,
          destination: params.destination,
          status: 'pending' // Payouts are often async
        })
      }
    });

    const stripe = Stripe(stripeKey);
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { amount, destination_account_id } = await req.json();
    
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

    // Start transaction (simulated via decrement first for safety)
    // In production, use a stored procedure or serializable transaction
    const { error: updateError } = await supabase
      .from('wallet_accounts')
      .update({ balance: wallet.balance - amount })
      .eq('id', wallet.id);

    if (updateError) throw updateError;

    // Create Stripe Transfer
    // Note: In real Connect flow, you'd look up the user's connected account ID
    const connectedAccountId = destination_account_id || 'acct_mock_destination'; 

    const transfer = await stripe.transfers.create({
      amount: Math.round(amount * 100),
      currency: 'gbp',
      destination: connectedAccountId,
      metadata: {
        user_id: user.id,
        type: 'wallet_withdrawal'
      }
    });

    // Record withdrawal
    await supabase.from('wallet_withdrawals').insert({
      wallet_id: wallet.id,
      amount: amount,
      stripe_transfer_id: transfer.id,
      status: 'pending' // Will be updated via webhook
    });

    // Record transaction log
    await supabase.from('wallet_transactions').insert({
      wallet_id: wallet.id,
      type: 'withdrawal',
      amount: -amount,
      balance_after: wallet.balance - amount,
      stripe_transaction_id: transfer.id,
      status: 'pending',
      description: 'Withdrawal to bank account'
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        transferId: transfer.id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

