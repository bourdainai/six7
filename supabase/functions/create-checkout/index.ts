import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const checkoutSchema = z.object({
  listingId: z.string().uuid({ message: 'Invalid listing ID format' }),
  shippingAddress: z.object({
    name: z.string().min(1).max(200),
    line1: z.string().min(1).max(200),
    line2: z.string().max(200).optional(),
    city: z.string().min(1).max(100),
    state: z.string().max(100).optional(),
    postal_code: z.string().min(1).max(20),
    country: z.string().length(2).regex(/^[A-Z]{2}$/, 'Invalid country code'),
  }),
  offerId: z.string().uuid().optional(),
  purchaseType: z.enum(['bundle']).optional(),
  variantId: z.string().uuid().optional(),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { listingId, shippingAddress, offerId, purchaseType, variantId } = checkoutSchema.parse(body);

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
      .select('*, seller:profiles!seller_id(id, stripe_connect_account_id, stripe_onboarding_complete, can_receive_payments)')
      .eq('id', listingId)
      .single();

    if (listingError || !listing) {
      throw new Error('Listing not found');
    }

    // Handle variant purchase
    let variant = null;
    if (variantId) {
      const { data: variantData, error: variantError } = await supabaseClient
        .from('listing_variants')
        .select('*')
        .eq('id', variantId)
        .eq('listing_id', listingId)
        .eq('is_available', true)
        .eq('is_sold', false)
        .single();

      if (variantError || !variantData) {
        throw new Error('Variant not found or no longer available');
      }
      variant = variantData;
    }

    // Handle bundle purchase - get all unsold variants
    let bundleVariants = [];
    if (purchaseType === 'bundle') {
      const { data: variants, error: variantsError } = await supabaseClient
        .from('listing_variants')
        .select('*')
        .eq('listing_id', listingId)
        .eq('is_sold', false)
        .eq('is_available', true);

      if (variantsError || !variants || variants.length === 0) {
        throw new Error('No variants available for bundle purchase');
      }
      bundleVariants = variants;
    }

    // Validate listing status
    if (listing.status !== 'active') {
      throw new Error('This listing is no longer available for purchase');
    }

    // Validate user is not buying their own item
    if (listing.seller_id === user.id) {
      throw new Error('You cannot purchase your own listing');
    }

    // Check if there's an accepted offer
    let offerAmount = null;
    if (offerId) {
      const { data: offer, error: offerError } = await supabaseClient
        .from('offers')
        .select('amount, status')
        .eq('id', offerId)
        .eq('status', 'accepted')
        .single();

      if (!offerError && offer) {
        offerAmount = Number(offer.amount);
      }
    }

    // Validate seller payment setup
    if (!listing.seller) {
      throw new Error('Seller information not found');
    }

    if (!listing.seller.stripe_connect_account_id) {
      throw new Error('Seller has not set up payment processing. Please contact support.');
    }

    if (!listing.seller.stripe_onboarding_complete) {
      throw new Error('Seller payment account setup is incomplete. Please try again later.');
    }

    if (!listing.seller.can_receive_payments) {
      throw new Error('Seller cannot receive payments at this time. Please contact support.');
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

    // Calculate item price based on purchase type
    let itemPrice;
    if (offerId && offerAmount !== null) {
      itemPrice = offerAmount;
    } else if (purchaseType === 'bundle') {
      // For bundle purchases, calculate based on available variants
      const availableVariants = bundleVariants.filter(v => v.is_available && !v.is_sold);
      const individualTotal = availableVariants.reduce((sum, v) => sum + Number(v.variant_price), 0);
      
      // Only apply discount if 2+ cards remain
      if (availableVariants.length >= 2 && listing.bundle_discount_percentage && listing.bundle_discount_percentage > 0) {
        itemPrice = individualTotal * (1 - listing.bundle_discount_percentage / 100);
      } else {
        // No discount applied, use sum of individual prices
        itemPrice = individualTotal;
      }
    } else if (variant) {
      itemPrice = Number(variant.variant_price);
    } else {
      itemPrice = Number(listing.seller_price);
    }

    // Calculate fees using the calculate-fees function
    const feesResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/calculate-fees`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.get('Authorization')!,
        },
        body: JSON.stringify({
          buyerId: user.id,
          sellerId: listing.seller_id,
          itemPrice: itemPrice,
          currency: listing.currency || 'GBP',
          shippingCost: shippingCost,
          wholesaleShippingCost: 0,
        }),
      }
    );

    if (!feesResponse.ok) {
      throw new Error('Failed to calculate fees');
    }

    const fees = await feesResponse.json();

    // Total amount includes item price, buyer transaction fee, and shipping
    // Buyer pays: item + buyer fee + shipping
    const totalAmount = fees.totalBuyerPays;
    
    // Extract fee details for recording
    const buyerTransactionFee = fees.buyerTransactionFee || fees.buyerProtectionFee;
    const sellerTransactionFee = fees.sellerTransactionFee || fees.sellerCommissionFee;

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Platform fee = buyer transaction fee + seller transaction fee
    // This is the total 6Seven takes (application_fee_amount in Stripe)
    const platformFee = Math.round((buyerTransactionFee + sellerTransactionFee) * 100); // in pence/cents
    const sellerAmount = Math.round(fees.totalSellerReceives * 100); // in pence/cents

    // Create payment intent with detailed fee metadata
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100), // in pence/cents
      currency: listing.currency.toLowerCase(),
      application_fee_amount: platformFee,
      transfer_data: {
        destination: listing.seller.stripe_connect_account_id,
      },
      metadata: {
        listingId: listing.id,
        buyerId: user.id,
        sellerId: listing.seller_id,
        itemPrice: itemPrice.toString(),
        shippingCost: shippingCost.toString(),
        buyerTransactionFee: buyerTransactionFee.toString(),
        sellerTransactionFee: sellerTransactionFee.toString(),
        platformFee: (platformFee / 100).toString(),
        offerId: offerId || '',
        buyerTier: fees.buyerTier,
        sellerTier: fees.sellerTier,
        sellerRiskTier: fees.sellerRiskTier,
        purchaseType: purchaseType || 'single',
        variantId: variantId || '',
        isBundle: purchaseType === 'bundle' ? 'true' : 'false',
      },
    });

    // Create order record with shipping info and detailed fee breakdown
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .insert({
        buyer_id: user.id,
        seller_id: listing.seller_id,
        total_amount: totalAmount,
        item_price: itemPrice,
        platform_fee: platformFee / 100,
        buyer_transaction_fee: buyerTransactionFee,
        seller_transaction_fee: sellerTransactionFee,
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

    // Create order item(s) and RESERVE variants (don't mark as sold yet)
    const reservationExpiry = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes
    
    try {
      if (purchaseType === 'bundle') {
        // Create order items for all bundle variants
        const orderItems = bundleVariants.map(v => ({
          order_id: order.id,
          listing_id: listing.id,
          variant_id: v.id,
          price: Number(v.variant_price),
        }));
        
        const { error: orderItemsError } = await supabaseClient.from('order_items').insert(orderItems);
        if (orderItemsError) {
          throw new Error(`Failed to create order items: ${orderItemsError.message}`);
        }
        
        // RESERVE bundle variants instead of marking as sold
        const variantIds = bundleVariants.map(v => v.id);
        const { error: reserveError } = await supabaseClient
          .from('listing_variants')
          .update({ 
            reserved_until: reservationExpiry,
            reserved_by: user.id 
          })
          .in('id', variantIds)
          .eq('is_sold', false) // Only reserve if not already sold
          .eq('is_available', true); // Only reserve if available
        
        if (reserveError) {
          throw new Error(`Failed to reserve variants: ${reserveError.message}`);
        }
          
      } else if (variant) {
        // Single variant purchase
        const { error: orderItemError } = await supabaseClient.from('order_items').insert({
          order_id: order.id,
          listing_id: listing.id,
          variant_id: variant.id,
          price: itemPrice,
        });
        
        if (orderItemError) {
          throw new Error(`Failed to create order item: ${orderItemError.message}`);
        }
        
        // RESERVE variant instead of marking as sold
        const { error: reserveError } = await supabaseClient
          .from('listing_variants')
          .update({ 
            reserved_until: reservationExpiry,
            reserved_by: user.id 
          })
          .eq('id', variant.id)
          .eq('is_sold', false) // Only reserve if not already sold
          .eq('is_available', true); // Only reserve if available
        
        if (reserveError) {
          throw new Error(`Failed to reserve variant: ${reserveError.message}`);
        }
          
      } else {
        // Regular single item purchase
        const { error: orderItemError } = await supabaseClient.from('order_items').insert({
          order_id: order.id,
          listing_id: listing.id,
          price: itemPrice,
        });
        
        if (orderItemError) {
          throw new Error(`Failed to create order item: ${orderItemError.message}`);
        }
      }
    } catch (reservationError) {
      // Rollback: cancel payment intent, delete order and payment records
      console.error('Reservation failed, rolling back:', reservationError);
      try {
        await stripe.paymentIntents.cancel(paymentIntent.id);
      } catch (cancelError) {
        console.error('Failed to cancel payment intent:', cancelError);
      }
      await supabaseClient.from('payments').delete().eq('order_id', order.id);
      await supabaseClient.from('order_items').delete().eq('order_id', order.id);
      await supabaseClient.from('orders').delete().eq('id', order.id);
      throw reservationError;
    }

    // Create payment record
    const { error: paymentInsertError } = await supabaseClient.from('payments').insert({
      order_id: order.id,
      stripe_payment_intent_id: paymentIntent.id,
      amount: itemPrice,
      currency: listing.currency,
      status: paymentIntent.status,
    });

    if (paymentInsertError) {
      // If payment record creation fails, we should cancel the payment intent
      // and clean up the order
      console.error('Failed to create payment record:', paymentInsertError);
      try {
        await stripe.paymentIntents.cancel(paymentIntent.id);
      } catch (cancelError) {
        console.error('Failed to cancel payment intent:', cancelError);
      }
      // Clean up order and order items
      await supabaseClient.from('order_items').delete().eq('order_id', order.id);
      await supabaseClient.from('orders').delete().eq('id', order.id);
      throw new Error('Failed to create payment record. Please try again.');
    }

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
    
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: 'Invalid request data', details: error.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});