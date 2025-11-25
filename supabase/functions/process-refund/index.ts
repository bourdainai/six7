import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const refundSchema = z.object({
  orderId: z.string().uuid(),
  refundType: z.enum(['full', 'partial']),
  refundAmount: z.number().optional(),
  reason: z.string(),
  adminNotes: z.string().optional(),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { orderId, refundType, refundAmount, reason, adminNotes } = refundSchema.parse(body);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify admin access
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Not authenticated');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) throw new Error('Not authenticated');

    // Check admin role
    const { data: adminRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!adminRole) {
      throw new Error('Admin access required');
    }

    console.log(`🔄 Processing ${refundType} refund for order: ${orderId}`);

    // Get order and payment details
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        payments(stripe_payment_intent_id, amount, currency, status)
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error('Order not found');
    }

    const payment = order.payments?.[0];
    if (!payment || !payment.stripe_payment_intent_id) {
      throw new Error('No payment found for this order');
    }

    if (payment.status !== 'succeeded') {
      throw new Error('Cannot refund a payment that did not succeed');
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Calculate refund amount
    const totalAmount = Math.round(Number(order.total_amount) * 100); // in pence
    const refundAmountPence = refundType === 'full' 
      ? totalAmount 
      : Math.round((refundAmount || 0) * 100);

    if (refundAmountPence <= 0 || refundAmountPence > totalAmount) {
      throw new Error('Invalid refund amount');
    }

    console.log(`💰 Refunding ${refundAmountPence / 100} ${payment.currency}`);

    // Create refund in Stripe
    const refund = await stripe.refunds.create({
      payment_intent: payment.stripe_payment_intent_id,
      amount: refundAmountPence,
      reason: 'requested_by_customer',
      metadata: {
        order_id: orderId,
        refund_type: refundType,
        admin_user_id: user.id,
        admin_reason: reason,
      },
    });

    console.log(`✅ Stripe refund created: ${refund.id}`);

    // Update order status
    await supabaseAdmin
      .from('orders')
      .update({ 
        status: refundType === 'full' ? 'refunded' : 'partially_refunded',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    // Update payment status
    await supabaseAdmin
      .from('payments')
      .update({ status: 'refunded' })
      .eq('stripe_payment_intent_id', payment.stripe_payment_intent_id);

    // Reverse payout if it was completed
    const { data: payout } = await supabaseAdmin
      .from('payouts')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (payout && payout.status === 'completed') {
      // Update seller balance - deduct the refund amount proportionally
      const sellerRefundAmount = (refundAmountPence / totalAmount) * Number(payout.amount);
      
      const { data: balance } = await supabaseAdmin
        .from('seller_balances')
        .select('*')
        .eq('seller_id', order.seller_id)
        .single();

      if (balance) {
        const currentAvailable = parseFloat(balance.available_balance.toString()) || 0;
        
        await supabaseAdmin
          .from('seller_balances')
          .update({
            available_balance: Math.max(0, currentAvailable - sellerRefundAmount),
            updated_at: new Date().toISOString(),
          })
          .eq('seller_id', order.seller_id);

        console.log(`💸 Adjusted seller balance by -${sellerRefundAmount}`);
      }
    }

    // Log admin action
    console.log(`📝 Admin ${user.email} processed ${refundType} refund for order ${orderId}`);

    return new Response(
      JSON.stringify({
        success: true,
        refundId: refund.id,
        refundAmount: refundAmountPence / 100,
        currency: payment.currency,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in process-refund:', error);
    
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