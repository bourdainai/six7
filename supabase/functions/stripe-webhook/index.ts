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

            // Check if payout already exists to prevent duplicates
            const { data: existingPayout } = await supabaseAdmin
              .from('payouts')
              .select('id')
              .eq('order_id', order.id)
              .single();

            if (!existingPayout) {
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
                
                // Update seller_balances - add to pending balance
                const { data: existingBalance } = await supabaseAdmin
                  .from('seller_balances')
                  .select('*')
                  .eq('seller_id', order.seller_id)
                  .single();

                if (existingBalance) {
                  // Update existing balance
                  await supabaseAdmin
                    .from('seller_balances')
                    .update({
                      pending_balance: (parseFloat(existingBalance.pending_balance.toString()) || 0) + parseFloat(order.seller_amount.toString()),
                      updated_at: new Date().toISOString(),
                    })
                    .eq('seller_id', order.seller_id);
                } else {
                  // Create new balance record
                  await supabaseAdmin
                    .from('seller_balances')
                    .insert({
                      seller_id: order.seller_id,
                      pending_balance: order.seller_amount,
                      available_balance: 0,
                      currency: order.currency,
                    });
                }
              }
            } else {
              console.log(`Payout already exists for order: ${payment.order_id}`);
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
              // Check if payout exists before updating
              const { data: existingPayout } = await supabaseAdmin
                .from('payouts')
                .select('id, status')
                .eq('order_id', payment.order_id)
                .single();

              if (existingPayout) {
                // Only update if not already completed
                if (existingPayout.status !== 'completed') {
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
                    
                    // Update seller_balances - move from pending to available
                    const { data: balance } = await supabaseAdmin
                      .from('seller_balances')
                      .select('*')
                      .eq('seller_id', existingPayout.seller_id)
                      .single();

                    if (balance) {
                      const currentPending = parseFloat(balance.pending_balance.toString()) || 0;
                      const currentAvailable = parseFloat(balance.available_balance.toString()) || 0;
                      const payoutAmount = parseFloat(existingPayout.amount.toString());

                      await supabaseAdmin
                        .from('seller_balances')
                        .update({
                          pending_balance: Math.max(0, currentPending - payoutAmount),
                          available_balance: currentAvailable + payoutAmount,
                          updated_at: new Date().toISOString(),
                        })
                        .eq('seller_id', existingPayout.seller_id);
                    }
                  }
                } else {
                  console.log(`Payout already completed for order: ${payment.order_id}`);
                }
              } else {
                console.warn(`No payout record found for order: ${payment.order_id}`);
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

      case 'transfer.failed':
      case 'transfer.paid_failed': {
        const transfer = event.data.object as Stripe.Transfer;
        
        // Find the payout record by transfer ID
        const { data: payout } = await supabaseAdmin
          .from('payouts')
          .select('*')
          .eq('stripe_transfer_id', transfer.id)
          .single();

        if (payout) {
          // Update payout status to failed
          await supabaseAdmin
            .from('payouts')
            .update({
              status: 'failed',
            })
            .eq('id', payout.id);

          // Update seller_balances - move back to pending (or keep in pending)
          const { data: balance } = await supabaseAdmin
            .from('seller_balances')
            .select('*')
            .eq('seller_id', payout.seller_id)
            .single();

          if (balance) {
            const currentAvailable = parseFloat(balance.available_balance.toString()) || 0;
            const currentPending = parseFloat(balance.pending_balance.toString()) || 0;
            const payoutAmount = parseFloat(payout.amount.toString());

            await supabaseAdmin
              .from('seller_balances')
              .update({
                available_balance: Math.max(0, currentAvailable - payoutAmount),
                pending_balance: currentPending + payoutAmount,
                updated_at: new Date().toISOString(),
              })
              .eq('seller_id', payout.seller_id);
          }

          console.log(`Transfer failed for payout: ${payout.id}, transfer: ${transfer.id}`);
        }
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