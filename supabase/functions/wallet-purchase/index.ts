import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const purchaseSchema = z.object({
  listingId: z.string().uuid('Invalid listing ID format'),
  variantId: z.string().uuid().optional(),
  purchaseType: z.enum(['single', 'variant', 'bundle']).optional(),
  shippingAddress: z.object({
    line1: z.string().max(100),
    line2: z.string().max(100).optional(),
    city: z.string().max(50),
    postcode: z.string().max(20),
    country: z.string().max(50)
  })
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { listingId, variantId, purchaseType, shippingAddress } = purchaseSchema.parse(body);
    
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

    let price = Number(listing.seller_price);
    let variant = null;
    let bundleVariants: any[] = [];

    // Handle different purchase types
    if (purchaseType === 'bundle' && listing.bundle_type === 'bundle_with_discount') {
      // Bundle purchase - get all available variants
      const { data: variants } = await supabase
        .from('listing_variants')
        .select('*')
        .eq('listing_id', listingId)
        .eq('is_available', true)
        .eq('is_sold', false);
      
      if (!variants || variants.length === 0) {
        throw new Error('No variants available for bundle purchase');
      }
      
      bundleVariants = variants;
      
      // Calculate bundle price with discount if 2+ cards
      const individualTotal = bundleVariants.reduce((sum, v) => sum + Number(v.variant_price), 0);
      
      if (bundleVariants.length >= 2 && listing.bundle_discount_percentage && listing.bundle_discount_percentage > 0) {
        price = individualTotal * (1 - listing.bundle_discount_percentage / 100);
      } else {
        price = individualTotal;
      }
    } else if (variantId) {
      // Single variant purchase
      const { data: variantData } = await supabase
        .from('listing_variants')
        .select('*')
        .eq('id', variantId)
        .eq('listing_id', listingId)
        .single();
      
      if (!variantData) throw new Error('Variant not found');
      if (!variantData.is_available) throw new Error('Variant sold out');
      if (variantData.variant_quantity < 1) throw new Error('Variant out of stock');
      
      variant = variantData;
      price = Number(variant.variant_price);
    } else if (listing.has_variants) {
      throw new Error('Please select a variant or purchase bundle');
    }

    const shipping = Number(listing.shipping_cost_uk || 0);
    const total = price + shipping;

    // 2. Check Wallet Balance
    const { data: wallet } = await supabase
      .from('wallet_accounts')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!wallet || wallet.balance < total) {
      throw new Error('Insufficient wallet balance');
    }

    // 3. Create Order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        buyer_id: user.id,
        seller_id: listing.seller_id,
        status: 'paid',
        total_amount: total,
        shipping_address: shippingAddress,
        shipping_cost: shipping,
        platform_fee: total * 0.06,
        seller_amount: total * 0.94,
        currency: listing.currency || 'GBP'
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Create order item with variant if applicable
    await supabase.from('order_items').insert({
      order_id: order.id,
      listing_id: listingId,
      variant_id: variantId || null,
      price: price
    });

    // 4. Deduct from Buyer Wallet
    const { error: deductError } = await supabase
      .from('wallet_accounts')
      .update({ balance: wallet.balance - total })
      .eq('id', wallet.id);

    if (deductError) throw deductError;

    // 5. Record Transaction
    const transactionDescription = purchaseType === 'bundle' 
      ? `Bundle purchase of ${listing.title} (${bundleVariants.length} cards)`
      : variant 
        ? `Purchase of ${listing.title} - ${variant.variant_name}`
        : `Purchase of ${listing.title}`;
    
    await supabase.from('wallet_transactions').insert({
      wallet_id: wallet.id,
      type: 'purchase',
      amount: -total,
      balance_after: wallet.balance - total,
      related_order_id: order.id,
      description: transactionDescription,
      status: 'completed'
    });

    // 6. Update Listing/Variant Status
    if (purchaseType === 'bundle' && bundleVariants.length > 0) {
      // Bundle purchase - mark all variants as sold
      const variantIds = bundleVariants.map(v => v.id);
      await supabase
        .from('listing_variants')
        .update({ 
          is_sold: true,
          is_available: false,
          sold_at: new Date().toISOString()
        })
        .in('id', variantIds);
      
      // Update listing status to sold
      await supabase
        .from('listings')
        .update({ status: 'sold' })
        .eq('id', listingId);
    } else if (variant) {
      // Single variant purchase - decrease variant quantity
      const newQuantity = variant.variant_quantity - 1;
      await supabase
        .from('listing_variants')
        .update({ 
          variant_quantity: newQuantity,
          is_available: newQuantity > 0,
          is_sold: newQuantity === 0,
          sold_at: newQuantity === 0 ? new Date().toISOString() : null
        })
        .eq('id', variantId);
      
      // Check if all variants are sold to update listing
      const { data: remainingVariants } = await supabase
        .from('listing_variants')
        .select('id')
        .eq('listing_id', listingId)
        .eq('is_available', true);
      
      if (!remainingVariants || remainingVariants.length === 0) {
        await supabase
          .from('listings')
          .update({ status: 'sold' })
          .eq('id', listingId);
      }
    } else {
      // Simple listing without variants
      await supabase
        .from('listings')
        .update({ status: 'sold' })
        .eq('id', listingId);
    }

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

