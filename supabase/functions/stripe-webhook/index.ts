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
        
        // Extract fee metadata for recording
        const buyerTransactionFee = paymentIntent.metadata?.buyerTransactionFee 
          ? parseFloat(paymentIntent.metadata.buyerTransactionFee) 
          : 0;
        const sellerTransactionFee = paymentIntent.metadata?.sellerTransactionFee 
          ? parseFloat(paymentIntent.metadata.sellerTransactionFee) 
          : 0;
        const platformFeeFromMeta = paymentIntent.metadata?.platformFee 
          ? parseFloat(paymentIntent.metadata.platformFee) 
          : 0;
        
        // Check if this is a wallet deposit FIRST
        if (paymentIntent.metadata?.type === 'wallet_deposit') {
          const depositId = paymentIntent.metadata.deposit_id;
          const userId = paymentIntent.metadata.user_id;
          const amount = Number(paymentIntent.amount) / 100; // Convert from pence to pounds
          
          if (depositId && userId) {
            // Check if deposit was already processed (idempotency)
            const { data: existingDeposit } = await supabaseAdmin
              .from('wallet_deposits')
              .select('status')
              .eq('id', depositId)
              .single();
            
            if (existingDeposit?.status === 'completed') {
              console.log(`Wallet deposit already processed: ${depositId}`);
              break;
            }
            
            // Update deposit status
            const { error: depositUpdateError } = await supabaseAdmin
              .from('wallet_deposits')
              .update({ 
                status: 'completed',
                completed_at: new Date().toISOString(),
                stripe_payment_intent_id: paymentIntent.id
              })
              .eq('id', depositId)
              .eq('status', 'pending'); // Only update if still pending
            
            if (depositUpdateError) {
              console.error('Error updating deposit:', depositUpdateError);
              break;
            }
            
            // Update wallet balance
            const { data: wallet } = await supabaseAdmin
              .from('wallet_accounts')
              .select('id, balance, pending_balance')
              .eq('user_id', userId)
              .single();
            
            if (wallet) {
              await supabaseAdmin
                .from('wallet_accounts')
                .update({
                  balance: (Number(wallet.balance) || 0) + amount,
                  pending_balance: Math.max(0, (Number(wallet.pending_balance) || 0) - amount)
                })
                .eq('user_id', userId);
              
              // Create transaction record (check for duplicates)
              const { data: existingTx } = await supabaseAdmin
                .from('wallet_transactions')
                .select('id')
                .eq('wallet_id', wallet.id)
                .eq('type', 'deposit')
                .eq('amount', amount)
                .eq('status', 'completed')
                .single();
              
              if (!existingTx) {
                await supabaseAdmin
                  .from('wallet_transactions')
                  .insert({
                    wallet_id: wallet.id,
                    type: 'deposit',
                    amount: amount,
                    status: 'completed',
                    description: 'Wallet deposit via card'
                  });
              }
            }
            
            console.log(`Wallet deposit completed: ${depositId} for user: ${userId}`);
          }
          break;
        }
        
        // Handle regular order payments
        // Check if payment was already processed (idempotency)
        const { data: existingPayment } = await supabaseAdmin
          .from('payments')
          .select('status, order_id')
          .eq('stripe_payment_intent_id', paymentIntent.id)
          .single();
        
        if (existingPayment?.status === 'succeeded') {
          console.log(`Payment already processed: ${paymentIntent.id}`);
          break;
        }
        
        // Update payment status
        const { error: paymentError } = await supabaseAdmin
          .from('payments')
          .update({ status: 'succeeded' })
          .eq('stripe_payment_intent_id', paymentIntent.id)
          .eq('status', 'pending'); // Only update if still pending

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

        if (!payment) {
          console.error(`Payment record not found for payment intent: ${paymentIntent.id}`);
          break;
        }

        // Get order details including seller_id and seller_amount
        const { data: order } = await supabaseAdmin
          .from('orders')
          .select('id, seller_id, seller_amount, currency, status')
          .eq('id', payment.order_id)
          .single();

        if (!order) {
          console.error(`Order not found: ${payment.order_id}`);
          break;
        }

        // Update order status to paid and record fees (idempotent)
        if (order.status !== 'paid') {
          const updateData: Record<string, any> = { 
            status: 'paid',
            paid_at: new Date().toISOString(),
          };
          
          // Record fee breakdown if available from metadata
          if (buyerTransactionFee > 0 || sellerTransactionFee > 0) {
            updateData.buyer_transaction_fee = buyerTransactionFee;
            updateData.seller_transaction_fee = sellerTransactionFee;
            updateData.platform_fee = platformFeeFromMeta || (buyerTransactionFee + sellerTransactionFee);
          }
          
          await supabaseAdmin
            .from('orders')
            .update(updateData)
            .eq('id', payment.order_id)
            .eq('status', 'pending'); // Only update if still pending
        }

        // Update listing status to sold AND mark variants as sold
        const { data: orderItems } = await supabaseAdmin
          .from('order_items')
          .select('listing_id, variant_id')
          .eq('order_id', payment.order_id);

        if (orderItems && orderItems.length > 0) {
          const listingId = orderItems[0].listing_id;
          
          // Check if this is a variant-based listing
          const { data: listing } = await supabaseAdmin
            .from('listings')
            .select('id, has_variants, status')
            .eq('id', listingId)
            .single();
          
          // Mark all variants in this order as sold (complete the reservation)
          const variantIds = orderItems
            .filter(item => item.variant_id)
            .map(item => item.variant_id);
          
          if (variantIds.length > 0) {
            await supabaseAdmin
              .from('listing_variants')
              .update({ 
                is_sold: true, 
                sold_at: new Date().toISOString(),
                reserved_until: null,
                reserved_by: null,
                is_available: false
              })
              .in('id', variantIds)
              .eq('is_sold', false); // Only update if not already sold
            
            // If this is a variant-based listing, recalculate bundle price
            if (listing?.has_variants) {
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
                    await supabaseAdmin
                      .from('listings')
                      .update({ status: 'sold' })
                      .eq('id', listingId)
                      .in('status', ['active', 'pending']);
                  }
                } else {
                  console.error(`Failed to recalculate bundle price for listing ${listingId}`);
                }
              } catch (bundleError) {
                console.error('Error calling bundle recalculation function:', bundleError);
              }
            } else {
              // Non-variant listing - mark as sold immediately
              await supabaseAdmin
                .from('listings')
                .update({ status: 'sold' })
                .eq('id', listingId)
                .in('status', ['active', 'pending']); // Only update if still active/pending
            }
          } else {
            // No variants - regular listing purchase
            await supabaseAdmin
              .from('listings')
              .update({ status: 'sold' })
              .eq('id', listingId)
              .in('status', ['active', 'pending']); // Only update if still active/pending
          }
        }

        // Check if payout already exists to prevent duplicates
        const { data: existingPayout } = await supabaseAdmin
          .from('payouts')
          .select('id, status')
          .eq('order_id', payment.order_id)
          .single();

        if (!existingPayout) {
          // Schedule payout (2 days after payment, will be triggered on delivery)
          await supabaseAdmin
            .from('payouts')
            .insert({
              order_id: payment.order_id,
              seller_id: order.seller_id,
              amount: order.seller_amount,
              currency: order.currency || 'GBP',
              status: 'pending',
              scheduled_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            });
          
          console.log(`Payout scheduled for order: ${order.id}`);
        } else {
          console.log(`Payout already exists for order: ${order.id}, status: ${existingPayout.status}`);
        }

        console.log(`Order paid and payout scheduled: ${order.id}`);
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

      case 'payout.paid': {
        const payout = event.data.object as Stripe.Payout;
        
        // Check if this is a wallet withdrawal
        if (payout.metadata?.type === 'wallet_withdrawal') {
          const walletId = payout.metadata.wallet_id;
          
          // Update withdrawal status
          await supabaseAdmin
            .from('wallet_withdrawals')
            .update({ 
              status: 'completed',
              completed_at: new Date().toISOString()
            })
            .eq('stripe_payout_id', payout.id);
          
          // Update transaction status
          await supabaseAdmin
            .from('wallet_transactions')
            .update({ status: 'completed' })
            .eq('stripe_transaction_id', payout.id);
          
          console.log(`Wallet withdrawal completed: payout ${payout.id}`);
        }
        break;
      }

      case 'payout.failed': {
        const payout = event.data.object as Stripe.Payout;
        
        // Check if this is a wallet withdrawal
        if (payout.metadata?.type === 'wallet_withdrawal') {
          const walletId = payout.metadata.wallet_id;
          const userId = payout.metadata.user_id;
          const amount = Number(payout.amount) / 100;
          
          // Update withdrawal status
          await supabaseAdmin
            .from('wallet_withdrawals')
            .update({ 
              status: 'failed',
              failed_at: new Date().toISOString(),
              error_message: payout.failure_message || 'Payout failed'
            })
            .eq('stripe_payout_id', payout.id);
          
          // Refund the wallet balance
          const { data: wallet } = await supabaseAdmin
            .from('wallet_accounts')
            .select('balance')
            .eq('id', walletId)
            .single();
          
          if (wallet) {
            await supabaseAdmin
              .from('wallet_accounts')
              .update({ balance: (Number(wallet.balance) || 0) + amount })
              .eq('id', walletId);
            
            // Update transaction status
            await supabaseAdmin
              .from('wallet_transactions')
              .update({ 
                status: 'failed',
                description: `Withdrawal failed: ${payout.failure_message || 'Unknown error'}`
              })
              .eq('stripe_transaction_id', payout.id);
          }
          
          console.log(`Wallet withdrawal failed: payout ${payout.id}`);
        }
        break;
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        
        // Check if onboarding is complete
        const chargesEnabled = account.charges_enabled;
        const detailsSubmitted = account.details_submitted;
        const payoutsEnabled = account.payouts_enabled;

        // Update profile based on account status
        const updateData: any = {
          stripe_onboarding_complete: chargesEnabled && detailsSubmitted,
          can_receive_payments: chargesEnabled && detailsSubmitted && payoutsEnabled,
        };

        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update(updateData)
          .eq('stripe_connect_account_id', account.id);

        if (updateError) {
          console.error(`Error updating profile for account ${account.id}:`, updateError);
        } else {
          console.log(`Stripe Connect account updated: ${account.id}, charges_enabled: ${chargesEnabled}, payouts_enabled: ${payoutsEnabled}`);
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
    // Sanitize error logging to prevent webhook secret exposure
    console.error('Webhook verification failed');
    return new Response(
      JSON.stringify({ error: 'Webhook verification failed' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
});