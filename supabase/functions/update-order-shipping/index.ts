import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const { orderId, trackingNumber, carrier } = await req.json();

    if (!orderId || !trackingNumber || !carrier) {
      throw new Error('Missing required fields: orderId, trackingNumber, carrier');
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

    // Verify seller owns this order
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select('seller_id, buyer_id, id')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error('Order not found');
    }

    if (order.seller_id !== user.id) {
      throw new Error('Unauthorized: You are not the seller of this order');
    }

    // Update order with shipping information
    const { error: updateError } = await supabaseClient
      .from('orders')
      .update({
        tracking_number: trackingNumber,
        carrier: carrier,
        shipped_at: new Date().toISOString(),
        shipping_status: 'shipped',
      })
      .eq('id', orderId);

    if (updateError) {
      throw new Error(`Failed to update order: ${updateError.message}`);
    }

    console.log(`Order ${orderId} marked as shipped with tracking ${trackingNumber}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Order shipping information updated successfully',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in update-order-shipping:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
