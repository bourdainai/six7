import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

    // Verify buyer owns this order
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select('buyer_id, seller_id, id, status, shipping_status, delivered_at')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error('Order not found');
    }

    if (order.buyer_id !== user.id) {
      throw new Error('Unauthorized: You are not the buyer of this order');
    }

    // Check if order is already delivered
    if (order.delivered_at) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Order already marked as delivered',
          alreadyDelivered: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update order with delivery information
    const { error: updateError } = await supabaseClient
      .from('orders')
      .update({
        delivered_at: new Date().toISOString(),
        shipping_status: 'delivered',
        status: 'completed',
      })
      .eq('id', orderId);

    if (updateError) {
      throw new Error(`Failed to mark order as delivered: ${updateError.message}`);
    }

    console.log(`Order ${orderId} marked as delivered by buyer ${user.id}`);

    // Trigger payout processing by calling the payout trigger function
    // Use the Supabase URL to make an HTTP request to the edge function
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    try {
      const payoutResponse = await fetch(`${supabaseUrl}/functions/v1/trigger-payout-on-delivery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ orderId }),
      });

      if (!payoutResponse.ok) {
        const errorData = await payoutResponse.json();
        console.error('Error triggering payout:', errorData);
        // Don't fail the delivery confirmation if payout trigger fails
        // The payout can be retried later
      } else {
        console.log(`Payout triggered for order ${orderId}`);
      }
    } catch (payoutError) {
      console.error('Error triggering payout:', payoutError);
      // Don't fail the delivery confirmation if payout trigger fails
      // The payout can be retried later
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Order marked as delivered. Payout will be processed shortly.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in mark-order-delivered:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

