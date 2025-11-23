import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sendcloud-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const signature = req.headers.get('x-sendcloud-signature');
    const webhookSecret = Deno.env.get('SENDCLOUD_WEBHOOK_SECRET');
    
    // Verify webhook signature
    if (webhookSecret && signature) {
      const payload = await req.text();
      const expectedSignature = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(payload + webhookSecret)
      );
      const expectedSig = Array.from(new Uint8Array(expectedSignature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      if (signature !== expectedSig) {
        console.error('Invalid webhook signature');
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    const event = await req.json();
    console.log('Sendcloud webhook event:', event);

    const { action, parcel } = event;

    if (!parcel?.external_order_id) {
      console.log('No external_order_id found in parcel data');
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const orderId = parcel.external_order_id;

    // Handle different webhook events
    switch (action) {
      case 'parcel_status_changed':
        const statusMap: Record<string, string> = {
          'announced': 'pending',
          'en_route_to_sorting_center': 'in_transit',
          'sorted': 'in_transit',
          'in_transit': 'in_transit',
          'out_for_delivery': 'out_for_delivery',
          'delivered': 'delivered',
          'exception': 'exception',
          'cancelled': 'cancelled',
        };

        const shippingStatus = statusMap[parcel.status?.message] || 'in_transit';

        await supabaseAdmin
          .from('orders')
          .update({
            shipping_status: shippingStatus,
            carrier: parcel.carrier?.name,
            tracking_number: parcel.tracking_number,
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId);

        console.log(`Order ${orderId} status updated to ${shippingStatus}`);
        break;

      case 'parcel_delivered':
        // Update order to delivered
        await supabaseAdmin
          .from('orders')
          .update({
            shipping_status: 'delivered',
            delivered_at: new Date().toISOString(),
            status: 'completed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId);

        // Trigger payout
        await supabaseAdmin.functions.invoke('trigger-payout-on-delivery', {
          body: { orderId }
        });

        console.log(`Order ${orderId} marked as delivered and payout triggered`);
        break;

      case 'parcel_exception':
        await supabaseAdmin
          .from('orders')
          .update({
            shipping_status: 'exception',
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId);

        // Create notification for seller
        const { data: order } = await supabaseAdmin
          .from('orders')
          .select('seller_id')
          .eq('id', orderId)
          .single();

        if (order) {
          await supabaseAdmin.from('notifications').insert({
            user_id: order.seller_id,
            type: 'shipping_exception',
            title: 'Shipping Issue',
            message: `There was an issue with order ${orderId}: ${parcel.status?.message}`,
            link: `/seller/orders`,
          });
        }

        console.log(`Exception reported for order ${orderId}`);
        break;

      default:
        console.log(`Unhandled webhook action: ${action}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Sendcloud webhook error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
