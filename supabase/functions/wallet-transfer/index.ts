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
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { amount, recipient_id, description } = await req.json();
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    if (user.id === recipient_id) {
      throw new Error('Cannot transfer to self');
    }

    // Fetch sender wallet
    const { data: senderWallet } = await supabase
      .from('wallet_accounts')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!senderWallet || senderWallet.balance < amount) {
      throw new Error('Insufficient funds');
    }

    // Fetch recipient wallet
    const { data: recipientWallet } = await supabase
      .from('wallet_accounts')
      .select('*')
      .eq('user_id', recipient_id)
      .single();

    if (!recipientWallet) {
      // Auto-create if missing? For now, error
      throw new Error('Recipient wallet not found');
    }

    // Perform transfer
    // In production, use RPC for atomicity
    
    // 1. Deduct from sender
    const { error: senderError } = await supabase
      .from('wallet_accounts')
      .update({ balance: senderWallet.balance - amount })
      .eq('id', senderWallet.id);
    
    if (senderError) throw senderError;

    // 2. Add to recipient
    const { error: recipientError } = await supabase
      .from('wallet_accounts')
      .update({ balance: recipientWallet.balance + amount })
      .eq('id', recipientWallet.id);

    if (recipientError) {
      // CRITICAL: Rollback sender deduction (simplified here)
      // Ideally use a Postgres function for this entire operation
      console.error('Failed to credit recipient, need manual intervention or rollback');
      throw recipientError;
    }

    // 3. Log transactions
    await supabase.from('wallet_transactions').insert([
      {
        wallet_id: senderWallet.id,
        type: 'transfer_out',
        amount: -amount,
        balance_after: senderWallet.balance - amount,
        related_user_id: recipient_id,
        description: description || 'Transfer to user',
        status: 'completed'
      },
      {
        wallet_id: recipientWallet.id,
        type: 'transfer_in',
        amount: amount,
        balance_after: recipientWallet.balance + amount,
        related_user_id: user.id,
        description: description || 'Transfer from user',
        status: 'completed'
      }
    ]);

    return new Response(
      JSON.stringify({ success: true }),
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

