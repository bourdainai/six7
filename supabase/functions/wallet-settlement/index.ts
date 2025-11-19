import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const settlementSchema = z.object({
  order_id: z.string().uuid('Invalid order ID format'),
  seller_id: z.string().uuid('Invalid seller ID format'),
  amount: z.number().positive('Amount must be positive'),
  fee_amount: z.number().min(0, 'Fee amount must be non-negative')
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // This function should be called by the order completion webhook or admin tool
    // It requires service role key authentication
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { order_id, seller_id, amount, fee_amount } = settlementSchema.parse(body);
    
    console.log(`Settling order ${order_id} for seller ${seller_id}`);

    // Get seller wallet
    let { data: wallet } = await supabase
      .from('wallet_accounts')
      .select('*')
      .eq('user_id', seller_id)
      .single();

    if (!wallet) {
      // Create if not exists
      const { data: newWallet, error } = await supabase
        .from('wallet_accounts')
        .insert({ user_id: seller_id })
        .select('*')
        .single();
      if (error) throw error;
      wallet = newWallet;
    }

    const netAmount = amount - fee_amount;

    // Create settlement record
    const { error: settlementError } = await supabase
      .from('wallet_settlements')
      .insert({
        seller_wallet_id: wallet.id,
        order_id: order_id, // Ensure this is a valid UUID if foreign key is enforced, or allow null if testing
        amount: amount,
        fee_amount: fee_amount,
        net_amount: netAmount,
        hold_until: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days hold
        released_at: null 
      });

    if (settlementError) throw settlementError;

    // Update pending balance
    const { error: updateError } = await supabase
      .from('wallet_accounts')
      .update({ 
        pending_balance: wallet.pending_balance + netAmount 
      })
      .eq('id', wallet.id);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ success: true, netAmount }),
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

