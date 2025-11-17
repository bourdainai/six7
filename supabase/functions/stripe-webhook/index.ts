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

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response('No signature', { status: 400 });
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''
    );

    console.log(`Received Stripe webhook: ${event.type}`);

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        // Update payment status
        const { error: paymentError } = await supabaseAdmin
          .from('payments')
          .update({ status: 'succeeded' })
          .eq('stripe_payment_intent_id', paymentIntent.id);

        if (paymentError) {
          console.error('Error updating payment:', paymentError);
          break;
        }

        // Get order and update status
        const { data: payment } = await supabaseAdmin
          .from('payments')
          .select('order_id')
          .eq('stripe_payment_intent_id', paymentIntent.id)
          .single();

        if (payment) {
          // Get order details including seller_id and seller_amount
          const { data: order } = await supabaseAdmin
            .from('orders')
            .select('id, seller_id, seller_amount, currency, status')
            .eq('id', payment.order_id)
            .single();

          if (order) {
            // Update order status to paid
            await supabaseAdmin
              .from('orders')
              .update({ status: 'paid' })
              .eq('id', payment.order_id);

            // Update listing status to sold
            const { data: orderItems } = await supabaseAdmin
              .from('order_items')
              .select('listing_id')
              .eq('order_id', payment.order_id);

            if (orderItems && orderItems.length > 0) {
              await supabaseAdmin
                .from('listings')
                .update({ status: 'sold' })
                .eq('id', orderItems[0].listing_id);
            }

            // Create payout record
            // Note: With application_fee_amount and transfer_data, Stripe automatically creates a transfer
            // The transfer ID will be available in the charge object, but we'll create the payout record now
            // and update it when we get the transfer information from charge.succeeded
            const { error: payoutError } = await supabaseAdmin
              .from('payouts')
              .insert({
                seller_id: order.seller_id,
                order_id: order.id,
                amount: order.seller_amount,
                currency: order.currency,
                status: 'pending',
              });

            if (payoutError) {
              console.error('Error creating payout record:', payoutError);
            } else {
              console.log(`Created payout record for order: ${payment.order_id}`);
            }

            console.log(`Payment succeeded for order: ${payment.order_id}`);
          }
        }
        break;
      }

      case 'charge.succeeded': {
        const charge = event.data.object as Stripe.Charge;
        
        // If this charge has a transfer (Connect account payment), update the payout record
        if (charge.transfer) {
          // Get the payment intent to find the order
          const paymentIntentId = typeof charge.payment_intent === 'string' 
            ? charge.payment_intent 
            : charge.payment_intent?.id;

          if (paymentIntentId) {
            const { data: payment } = await supabaseAdmin
              .from('payments')
              .select('order_id')
              .eq('stripe_payment_intent_id', paymentIntentId)
              .single();

            if (payment) {
              // Update payout with transfer ID and mark as completed
              const { error: payoutUpdateError } = await supabaseAdmin
                .from('payouts')
                .update({
                  stripe_transfer_id: charge.transfer as string,
                  status: 'completed',
                  completed_at: new Date().toISOString(),
                })
                .eq('order_id', payment.order_id);

              if (payoutUpdateError) {
                console.error('Error updating payout with transfer ID:', payoutUpdateError);
              } else {
                console.log(`Updated payout with transfer ID: ${charge.transfer} for order: ${payment.order_id}`);
              }
            }
          }
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        
        await supabaseAdmin
          .from('payments')
          .update({ status: 'failed' })
          .eq('stripe_payment_intent_id', paymentIntent.id);

        console.log(`Payment failed for intent: ${paymentIntent.id}`);
        break;
      }

      case 'account.updated': {
        const account = event.data.object;
        
        // Check if onboarding is complete
        const chargesEnabled = account.charges_enabled;
        const detailsSubmitted = account.details_submitted;

        if (chargesEnabled && detailsSubmitted) {
          await supabaseAdmin
            .from('profiles')
            .update({
              stripe_onboarding_complete: true,
              can_receive_payments: true,
            })
            .eq('stripe_connect_account_id', account.id);

          console.log(`Stripe Connect onboarding complete for account: ${account.id}`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
});