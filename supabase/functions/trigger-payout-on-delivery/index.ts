import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId } = await req.json();

    if (!orderId) {
      throw new Error('Missing required field: orderId');
    }

    // Get order details
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, seller_id, seller_amount, currency, delivered_at, status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error('Order not found');
    }

    // Verify order is delivered
    if (!order.delivered_at) {
      throw new Error('Order must be marked as delivered before payout can be processed');
    }

    if (order.status !== 'completed' && order.status !== 'delivered') {
      throw new Error(`Order status must be 'completed' or 'delivered' to process payout. Current status: ${order.status}`);
    }

    // Get seller's Stripe Connect account
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_connect_account_id, can_receive_payments')
      .eq('id', order.seller_id)
      .single();

    if (profileError || !profile) {
      throw new Error('Seller profile not found');
    }

    if (!profile.stripe_connect_account_id) {
      throw new Error('Seller has not set up Stripe Connect account');
    }

    if (!profile.can_receive_payments) {
      throw new Error('Seller account is not ready to receive payments');
    }

    // Get existing payout record
    const { data: existingPayout, error: payoutError } = await supabaseAdmin
      .from('payouts')
      .select('id, status, stripe_transfer_id')
      .eq('order_id', orderId)
      .single();

    if (payoutError && payoutError.code !== 'PGRST116') { // PGRST116 = not found
      throw new Error(`Error checking payout: ${payoutError.message}`);
    }

    // If payout already completed, return success (idempotency)
    if (existingPayout && existingPayout.status === 'completed') {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Payout already completed',
          payoutId: existingPayout.id,
          transferId: existingPayout.stripe_transfer_id,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If payout is already processing, return current status
    if (existingPayout && existingPayout.status === 'processing') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Payout is already being processed',
          payoutId: existingPayout.id,
          status: existingPayout.status,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the payment intent to find the charge
    const { data: payment } = await supabaseAdmin
      .from('payments')
      .select('stripe_payment_intent_id')
      .eq('order_id', orderId)
      .single();

    if (!payment) {
      throw new Error('Payment not found for this order');
    }

    // Retrieve the payment intent to get the charge
    const paymentIntent = await stripe.paymentIntents.retrieve(payment.stripe_payment_intent_id);
    
    if (!paymentIntent.latest_charge) {
      throw new Error('Charge not found for payment intent');
    }

    // Get the charge to find the transfer
    const charge = await stripe.charges.retrieve(paymentIntent.latest_charge as string);
    
    if (!charge.transfer) {
      // If no transfer exists, create one manually
      // This happens when the payment was created without transfer_data
      const transfer = await stripe.transfers.create({
        amount: Math.round(parseFloat(order.seller_amount.toString()) * 100), // Convert to cents
        currency: order.currency.toLowerCase(),
        destination: profile.stripe_connect_account_id,
        metadata: {
          order_id: orderId,
          seller_id: order.seller_id,
        },
      });

      // Update or create payout record
      if (existingPayout) {
        const { error: updateError } = await supabaseAdmin
          .from('payouts')
          .update({
            stripe_transfer_id: transfer.id,
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', existingPayout.id)
          .eq('status', 'pending'); // Only update if still pending
        
        if (updateError) {
          throw new Error(`Failed to update payout: ${updateError.message}`);
        }
      } else {
        const { error: insertError } = await supabaseAdmin
          .from('payouts')
          .insert({
            seller_id: order.seller_id,
            order_id: orderId,
            amount: order.seller_amount,
            currency: order.currency,
            stripe_transfer_id: transfer.id,
            status: 'completed',
            completed_at: new Date().toISOString(),
          });
        
        if (insertError) {
          throw new Error(`Failed to create payout record: ${insertError.message}`);
        }
      }

      // Update seller balance - move from pending to available
      const { data: balance } = await supabaseAdmin
        .from('seller_balances')
        .select('*')
        .eq('seller_id', order.seller_id)
        .single();

      if (balance) {
        const currentPending = parseFloat(balance.pending_balance.toString()) || 0;
        const currentAvailable = parseFloat(balance.available_balance.toString()) || 0;
        const payoutAmount = parseFloat(order.seller_amount.toString());

        await supabaseAdmin
          .from('seller_balances')
          .update({
            pending_balance: Math.max(0, currentPending - payoutAmount),
            available_balance: currentAvailable + payoutAmount,
            updated_at: new Date().toISOString(),
          })
          .eq('seller_id', order.seller_id);
      } else {
        // Create balance record if it doesn't exist
        await supabaseAdmin
          .from('seller_balances')
          .insert({
            seller_id: order.seller_id,
            available_balance: order.seller_amount,
            pending_balance: 0,
            currency: order.currency,
          });
      }

      console.log(`Payout completed for order ${orderId}, transfer: ${transfer.id}`);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Payout processed successfully',
          transferId: transfer.id,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Transfer already exists (from original payment)
      // Just update the payout record status
      if (existingPayout) {
        await supabaseAdmin
          .from('payouts')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', existingPayout.id);
      }

      // Update seller balance (idempotent - only if payout was updated)
      if (existingPayout) {
        const { data: balance } = await supabaseAdmin
          .from('seller_balances')
          .select('*')
          .eq('seller_id', order.seller_id)
          .single();

        if (balance) {
          const currentPending = parseFloat(balance.pending_balance.toString()) || 0;
          const currentAvailable = parseFloat(balance.available_balance.toString()) || 0;
          const payoutAmount = parseFloat(order.seller_amount.toString());

          // Only update if balance hasn't been updated yet (check if pending balance still includes this amount)
          if (currentPending >= payoutAmount) {
            await supabaseAdmin
              .from('seller_balances')
              .update({
                pending_balance: Math.max(0, currentPending - payoutAmount),
                available_balance: currentAvailable + payoutAmount,
                updated_at: new Date().toISOString(),
              })
              .eq('seller_id', order.seller_id);
          }
        } else {
          // Create balance record if it doesn't exist
          await supabaseAdmin
            .from('seller_balances')
            .insert({
              seller_id: order.seller_id,
              available_balance: order.seller_amount,
              pending_balance: 0,
              currency: order.currency,
            });
        }
      }

      console.log(`Payout marked as completed for order ${orderId}`);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Payout completed (transfer already existed)',
          transferId: charge.transfer as string,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error in trigger-payout-on-delivery:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

