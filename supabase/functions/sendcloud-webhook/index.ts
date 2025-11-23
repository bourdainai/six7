import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload = await req.json();
    console.log('Sendcloud webhook received:', JSON.stringify(payload, null, 2));

    const { parcel } = payload;
    
    if (!parcel || !parcel.id) {
      console.error('Invalid webhook payload - missing parcel data');
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find the order associated with this parcel
    const { data: parcelData, error: parcelError } = await supabase
      .from('sendcloud_parcels')
      .select('order_id')
      .eq('sendcloud_parcel_id', parcel.id.toString())
      .single();

    if (parcelError || !parcelData) {
      console.error('Parcel not found:', parcelError);
      return new Response(JSON.stringify({ error: 'Parcel not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const orderId = parcelData.order_id;

    // Update parcel status
    const { error: updateError } = await supabase
      .from('sendcloud_parcels')
      .update({
        status: parcel.status?.message || 'unknown',
        tracking_number: parcel.tracking_number,
        tracking_url: parcel.tracking_url,
        carrier: parcel.carrier?.name,
        shipped_at: parcel.shipment?.date_announced,
        updated_at: new Date().toISOString(),
      })
      .eq('sendcloud_parcel_id', parcel.id.toString());

    if (updateError) {
      console.error('Error updating parcel:', updateError);
      throw updateError;
    }

    // Map Sendcloud status to our shipping status
    const statusMap: Record<string, string> = {
      'announced': 'processing',
      'en_route_to_sorting_center': 'shipped',
      'sorting': 'shipped',
      'in_transit': 'shipped',
      'out_for_delivery': 'shipped',
      'delivered': 'delivered',
      'returned': 'cancelled',
      'delivery_failed': 'processing',
    };

    const newShippingStatus = statusMap[parcel.status?.id] || 'processing';

    const orderUpdate: any = {
      shipping_status: newShippingStatus,
      tracking_number: parcel.tracking_number,
      carrier: parcel.carrier?.name,
      updated_at: new Date().toISOString(),
    };

    // Update order status if delivered
    if (parcel.status?.id === 'delivered') {
      orderUpdate.status = 'delivered';
      orderUpdate.delivered_at = new Date().toISOString();
    } else if (parcel.shipment?.date_announced) {
      orderUpdate.shipped_at = parcel.shipment.date_announced;
    }

    const { error: orderUpdateError } = await supabase
      .from('orders')
      .update(orderUpdate)
      .eq('id', orderId);

    if (orderUpdateError) {
      console.error('Error updating order:', orderUpdateError);
      throw orderUpdateError;
    }

    // Get order details for notifications
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('buyer_id, seller_id, status')
      .eq('id', orderId)
      .single();

    if (orderError) {
      console.error('Error fetching order:', orderError);
      throw orderError;
    }

    // Send notifications based on status
    if (parcel.status?.id === 'announced' || parcel.status?.id === 'in_transit') {
      await supabase.functions.invoke('send-notification', {
        body: {
          userId: order.buyer_id,
          title: 'Your order has shipped! 📦',
          message: `Track your package: ${parcel.tracking_number}`,
          type: 'order_update',
          link: `/orders`,
          metadata: {
            orderId,
            trackingNumber: parcel.tracking_number,
            trackingUrl: parcel.tracking_url,
          }
        }
      });
    }

    if (parcel.status?.id === 'delivered') {
      await supabase.functions.invoke('send-notification', {
        body: {
          userId: order.buyer_id,
          title: 'Order Delivered! ✅',
          message: 'Your order has been delivered.',
          type: 'order_delivered',
          link: `/orders`,
          metadata: { orderId }
        }
      });

      await supabase.functions.invoke('send-notification', {
        body: {
          userId: order.seller_id,
          title: 'Order Delivered ✅',
          message: 'Your sale has been delivered to the buyer.',
          type: 'order_delivered',
          link: `/orders`,
          metadata: { orderId }
        }
      });

      // Trigger payout on delivery
      await supabase.functions.invoke('trigger-payout-on-delivery', {
        body: { orderId }
      });
    }

    if (parcel.status?.id === 'delivery_failed') {
      await supabase.functions.invoke('send-notification', {
        body: {
          userId: order.buyer_id,
          title: 'Delivery Attempt Failed ⚠️',
          message: 'Carrier was unable to deliver your package.',
          type: 'order_update',
          link: `/orders`,
          metadata: { orderId }
        }
      });
    }

    console.log('Webhook processed successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});