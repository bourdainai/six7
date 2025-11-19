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

    const { listingId, shippingAddress } = await req.json();
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) throw new Error('Invalid user token');

    // 1. Get Listing and Price
    const { data: listing } = await supabase
      .from('listings')
      .select('*, seller:profiles(id)')
      .eq('id', listingId)
      .single();
      
    if (!listing) throw new Error('Listing not found');
    if (listing.status !== 'active') throw new Error('Listing not active');

    const price = Number(listing.seller_price);
    const shipping = Number(listing.shipping_cost_uk || 0);
    const total = price + shipping; // Simplified fees for now

    // 2. Check Wallet Balance
    const { data: wallet } = await supabase
      .from('wallet_accounts')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!wallet || wallet.balance < total) {
      throw new Error('Insufficient wallet balance');
    }

    // 3. Create Order (assuming orders table exists)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        buyer_id: user.id,
        listing_id: listingId,
        status: 'paid',
        total_amount: total,
        shipping_address: shippingAddress,
        payment_method: 'wallet'
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // 4. Deduct from Buyer Wallet
    const { error: deductError } = await supabase
      .from('wallet_accounts')
      .update({ balance: wallet.balance - total })
      .eq('id', wallet.id);

    if (deductError) throw deductError;

    // 5. Record Transaction
    await supabase.from('wallet_transactions').insert({
      wallet_id: wallet.id,
      type: 'purchase',
      amount: -total,
      balance_after: wallet.balance - total,
      related_order_id: order.id,
      description: `Purchase of ${listing.title}`,
      status: 'completed'
    });

    // 6. Update Listing Status
    await supabase
      .from('listings')
      .update({ status: 'sold' })
      .eq('id', listingId);

    // 7. Credit Seller (Pending Settlement)
    // This calls wallet-settlement or does it directly. 
    // For now, we'll assume settlement happens later via webhook or manual trigger, 
    // OR we can credit pending balance here.
    
    // Call wallet-settlement logic or similar? 
    // Let's just update seller pending balance for now to be instant
    // Fetch seller wallet
    let { data: sellerWallet } = await supabase
      .from('wallet_accounts')
      .select('*')
      .eq('user_id', listing.seller_id)
      .single();
    
    if (!sellerWallet) {
       const { data: newW } = await supabase.from('wallet_accounts').insert({ user_id: listing.seller_id }).select().single();
       sellerWallet = newW;
    }

    await supabase.from('wallet_accounts').update({
      pending_balance: sellerWallet.pending_balance + (total * 0.94) // Taking 6% fee roughly
    }).eq('id', sellerWallet.id);

    return new Response(
      JSON.stringify({ success: true, orderId: order.id }),
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

