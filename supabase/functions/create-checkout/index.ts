import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { listingId, shippingAddress } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }

    // Get listing details with shipping info
    const { data: listing, error: listingError } = await supabaseClient
      .from('listings')
      .select('*, seller:profiles!seller_id(id, stripe_connect_account_id, stripe_onboarding_complete)')
      .eq('id', listingId)
      .single();

    if (listingError || !listing) {
      throw new Error('Listing not found');
    }

    if (!listing.seller.stripe_connect_account_id || !listing.seller.stripe_onboarding_complete) {
      throw new Error('Seller has not completed Stripe onboarding');
    }

    // Calculate shipping cost based on country
    let shippingCost = 0;
    const country = shippingAddress.country?.toUpperCase() || 'GB';
    
    if (!listing.free_shipping) {
      if (country === 'GB') {
        shippingCost = Number(listing.shipping_cost_uk || 0);
      } else if (['FR', 'DE', 'IT', 'ES', 'NL', 'BE', 'IE', 'AT', 'PT', 'DK', 'SE', 'FI', 'NO'].includes(country)) {
        shippingCost = Number(listing.shipping_cost_europe || 0);
      } else {
        shippingCost = Number(listing.shipping_cost_international || 0);
      }
    }

    // Calculate fees (10% platform fee on item price only)
    const listingPrice = Number(listing.seller_price);
    const totalAmount = listingPrice + shippingCost;
    const platformFee = Math.round(listingPrice * 0.10 * 100); // in pence
    const sellerAmount = Math.round(listingPrice * 100) - platformFee;

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Create payment intent with application fee (total includes shipping)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100), // in pence (item + shipping)
      currency: listing.currency.toLowerCase(),
      application_fee_amount: platformFee,
      transfer_data: {
        destination: listing.seller.stripe_connect_account_id,
      },
      metadata: {
        listingId: listing.id,
        buyerId: user.id,
        sellerId: listing.seller_id,
        shippingCost: shippingCost.toString(),
      },
    });

    // Create order record with shipping info
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .insert({
        buyer_id: user.id,
        seller_id: listing.seller_id,
        total_amount: totalAmount,
        platform_fee: platformFee / 100,
        seller_amount: sellerAmount / 100,
        currency: listing.currency,
        status: 'pending',
        shipping_address: shippingAddress,
        shipping_cost: shippingCost,
        shipping_status: 'awaiting_shipment',
      })
      .select()
      .single();

    if (orderError) {
      throw new Error(`Failed to create order: ${orderError.message}`);
    }

    // Create order item
    await supabaseClient.from('order_items').insert({
      order_id: order.id,
      listing_id: listing.id,
      price: listingPrice,
    });

    // Create payment record
    await supabaseClient.from('payments').insert({
      order_id: order.id,
      stripe_payment_intent_id: paymentIntent.id,
      amount: listingPrice,
      currency: listing.currency,
      status: paymentIntent.status,
    });

    console.log(`Created checkout for listing: ${listingId}, order: ${order.id}, payment intent: ${paymentIntent.id}`);

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        orderId: order.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in create-checkout:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});