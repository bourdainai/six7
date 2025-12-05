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
    if (userError || !user) throw new Error('Unauthorized');

    // 1. Get Listing with validation
    const { data: listing } = await supabase
      .from('listings')
      .select('*, seller:profiles(id)')
      .eq('id', listingId)
      .single();
      
    if (!listing) throw new Error('Listing not found');
    if (listing.status !== 'active') throw new Error('This item is no longer available');
    if (listing.seller_id === user.id) throw new Error('Cannot purchase your own listing');

    let price = Number(listing.seller_price);
    let variant = null;
    let bundleVariants: any[] = [];

    // 2. Handle different purchase types with validation
    if (purchaseType === 'bundle') {
      // Validate bundle purchase is allowed
      if (!listing.has_variants || listing.bundle_type !== 'split') {
        throw new Error('This listing is not available as a bundle');
      }

      // Get all available variants
      const { data: variants, error: variantsError } = await supabase
        .from('listing_variants')
        .select('*')
        .eq('listing_id', listingId)
        .eq('is_available', true)
        .eq('is_sold', false)
        .order('display_order');
      
      if (variantsError) throw new Error('Failed to fetch bundle items');
      if (!variants || variants.length === 0) {
        throw new Error('No available cards in bundle - all items may have been sold');
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
      // Single variant purchase with concurrent check
      const { data: variantData, error: variantError } = await supabase
        .from('listing_variants')
        .select('*')
        .eq('id', variantId)
        .eq('listing_id', listingId)
        .single();
      
      if (variantError || !variantData) throw new Error('Variant not found');
      if (!variantData.is_available || variantData.is_sold) {
        throw new Error('This variant is no longer available - it may have just been sold');
      }
      if (variantData.variant_quantity < 1) {
        throw new Error('This variant is out of stock');
      }
      
      variant = variantData;
      price = Number(variant.variant_price);
    } else if (listing.has_variants) {
      throw new Error('Please select a variant or purchase bundle');
    }

    const shipping = Number(listing.shipping_cost_uk || 0);
    const total = price + shipping;

    // 3. Check Wallet Balance with detailed error
    const { data: wallet, error: walletError } = await supabase
      .from('wallet_accounts')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet) {
      throw new Error('Wallet not found. Please contact support.');
    }

    const availableBalance = Number(wallet.balance);
    if (availableBalance < total) {
      throw new Error(`Insufficient funds. You need £${total.toFixed(2)} but only have £${availableBalance.toFixed(2)}`);
    }

    // 4. Create Order (transaction start point)
    const platformFee = total * 0.06;
    const sellerAmount = total * 0.94;

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        buyer_id: user.id,
        seller_id: listing.seller_id,
        status: 'paid',
        total_amount: total,
        shipping_address: shippingAddress,
        shipping_cost: shipping,
        platform_fee: platformFee,
        seller_amount: sellerAmount,
        currency: listing.currency || 'GBP'
      })
      .select()
      .single();

    if (orderError) {
      console.error('Order creation failed:', orderError);
      throw new Error('Failed to create order. Please try again.');
    }

    // Create order item with variant if applicable
    const { error: orderItemError } = await supabase.from('order_items').insert({
      order_id: order.id,
      listing_id: listingId,
      variant_id: variantId || null,
      price: price
    });

    if (orderItemError) {
      console.error('Order item creation failed:', orderItemError);
      // Rollback: delete order
      await supabase.from('orders').delete().eq('id', order.id);
      throw new Error('Failed to create order item. Transaction cancelled.');
    }

    // 5. Deduct from Buyer Wallet with optimistic concurrency check
    const newBalance = availableBalance - total;
    const { error: deductError } = await supabase
      .from('wallet_accounts')
      .update({ balance: newBalance })
      .eq('id', wallet.id)
      .eq('balance', availableBalance); // Ensure balance hasn't changed

    if (deductError) {
      console.error('Wallet deduction failed:', deductError);
      // Rollback: delete order items and order
      await supabase.from('order_items').delete().eq('order_id', order.id);
      await supabase.from('orders').delete().eq('id', order.id);
      throw new Error('Failed to process payment. Your balance may have changed. Please try again.');
    }

    // 6. Record Transaction
    const transactionDescription = purchaseType === 'bundle' 
      ? `Bundle purchase: ${listing.title} (${bundleVariants.length} cards)`
      : variant 
        ? `Purchase: ${listing.title} - ${variant.variant_name}`
        : `Purchase: ${listing.title}`;
    
    const { error: txError } = await supabase.from('wallet_transactions').insert({
      wallet_id: wallet.id,
      type: 'purchase',
      amount: -total,
      balance_after: newBalance,
      related_order_id: order.id,
      description: transactionDescription,
      status: 'completed'
    });

    if (txError) {
      console.error('Failed to record transaction:', txError);
      // Non-critical, continue with purchase
    }

    // 7. Update Listing/Variant Status with rollback on failure
    try {
      if (purchaseType === 'bundle' && bundleVariants.length > 0) {
        // Bundle purchase - mark all variants as sold
        const variantIds = bundleVariants.map(v => v.id);
        const { error: variantUpdateError } = await supabase
          .from('listing_variants')
          .update({ 
            is_sold: true,
            is_available: false,
            sold_at: new Date().toISOString()
          })
          .in('id', variantIds);
        
        if (variantUpdateError) {
          console.error('Failed to update variants:', variantUpdateError);
          throw new Error('Failed to update item availability');
        }
        
        // Update listing status to sold
        const { error: listingUpdateError } = await supabase
          .from('listings')
          .update({ status: 'sold' })
          .eq('id', listingId);
        
        if (listingUpdateError) {
          console.error('Failed to update listing:', listingUpdateError);
        }
      } else if (variant) {
        // Single variant purchase - decrease variant quantity with concurrent check
        const { data: currentVariant } = await supabase
          .from('listing_variants')
          .select('variant_quantity, is_available, is_sold')
          .eq('id', variantId)
          .single();

        if (!currentVariant || !currentVariant.is_available || currentVariant.is_sold) {
          throw new Error('Variant is no longer available');
        }

        const newQuantity = currentVariant.variant_quantity - 1;
        const { error: variantUpdateError } = await supabase
          .from('listing_variants')
          .update({ 
            variant_quantity: newQuantity,
            is_available: newQuantity > 0,
            is_sold: newQuantity === 0,
            sold_at: newQuantity === 0 ? new Date().toISOString() : null
          })
          .eq('id', variantId)
          .eq('variant_quantity', currentVariant.variant_quantity); // Optimistic lock
        
        if (variantUpdateError) {
          console.error('Failed to update variant:', variantUpdateError);
          throw new Error('Failed to update item - item may have been sold');
        }
        
        // Recalculate bundle price after variant sale
        if (listing.has_variants) {
          try {
            const bundleUpdateResponse = await fetch(
              `${Deno.env.get('SUPABASE_URL')}/functions/v1/update-bundle-after-variant-sale`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                },
                body: JSON.stringify({ listingId }),
              }
            );
            
            if (bundleUpdateResponse.ok) {
              const bundleUpdate = await bundleUpdateResponse.json();
              console.log(`Bundle price recalculated for listing ${listingId}:`, bundleUpdate);
              
              // Check if all variants are now sold - if so, mark listing as sold
              if (bundleUpdate.remainingVariants === 0) {
                await supabase
                  .from('listings')
                  .update({ status: 'sold' })
                  .eq('id', listingId);
              }
            } else {
              console.error(`Failed to recalculate bundle price for listing ${listingId}`);
              // Non-critical error, continue with purchase
            }
          } catch (bundleError) {
            console.error('Error calling bundle recalculation function:', bundleError);
            // Non-critical error, continue with purchase
          }
        } else {
          // Check if all variants are sold to update listing (fallback for non-bundle variant listings)
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
        }
      } else {
        // Simple listing without variants
        const { error: listingUpdateError } = await supabase
          .from('listings')
          .update({ status: 'sold' })
          .eq('id', listingId)
          .eq('status', 'active'); // Only update if still active
        
        if (listingUpdateError) {
          console.error('Failed to update listing:', listingUpdateError);
          throw new Error('Failed to mark item as sold - item may have already been purchased');
        }
      }
    } catch (inventoryError) {
      console.error('Inventory update failed - rolling back:', inventoryError);
      // Critical failure - attempt full rollback
      await supabase.from('wallet_transactions').delete().eq('wallet_id', wallet.id).eq('related_order_id', order.id);
      await supabase.from('wallet_accounts').update({ balance: availableBalance }).eq('id', wallet.id);
      await supabase.from('order_items').delete().eq('order_id', order.id);
      await supabase.from('orders').delete().eq('id', order.id);
      
      throw new Error(inventoryError instanceof Error ? inventoryError.message : 'Failed to complete purchase');
    }

    // 8. Credit Seller Pending Balance
    let { data: sellerWallet } = await supabase
      .from('wallet_accounts')
      .select('*')
      .eq('user_id', listing.seller_id)
      .single();
    
    if (!sellerWallet) {
      const { data: newW } = await supabase.from('wallet_accounts').insert({ user_id: listing.seller_id }).select().single();
      sellerWallet = newW;
    }

    if (sellerWallet) {
      const { error: sellerWalletError } = await supabase.from('wallet_accounts').update({
        pending_balance: Number(sellerWallet.pending_balance) + sellerAmount
      }).eq('id', sellerWallet.id);

      if (sellerWalletError) {
        console.error('Failed to credit seller pending balance:', sellerWalletError);
        // Non-critical, seller will still get paid after delivery
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        orderId: order.id,
        amount: total,
        purchaseType,
        itemCount: purchaseType === 'bundle' ? bundleVariants.length : 1
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Wallet purchase error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Purchase failed';
    const statusCode = errorMessage.includes('Unauthorized') ? 401 : 
                       errorMessage.includes('not found') ? 404 : 400;
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
