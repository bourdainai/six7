import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateLabelRequest {
  orderId: string;
  carrierCode?: string; // Optional, will use best rate if not provided
  servicePointId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { orderId, carrierCode, servicePointId }: CreateLabelRequest = await req.json();

    // Fetch order details
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        order_items(listing_id, price, listings(title, package_weight, package_dimensions))
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error('Order not found');
    }

    // Verify user is the seller
    if (order.seller_id !== user.id) {
      throw new Error('Not authorized to create label for this order');
    }

    // Fetch seller profile for return address
    const { data: sellerProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email, phone_number, country')
      .eq('id', order.seller_id)
      .single();

    // Calculate total weight from items
    const totalWeight = order.order_items.reduce((sum: number, item: any) => {
      return sum + (item.listings?.package_weight || 100); // Default 100g if not specified
    }, 0);

    const shippingAddress = order.shipping_address as any;

    // Prepare SendCloud API request
    const sendcloudPublicKey = Deno.env.get('SENDCLOUD_PUBLIC_KEY');
    const sendcloudSecretKey = Deno.env.get('SENDCLOUD_SECRET_KEY');

    if (!sendcloudPublicKey || !sendcloudSecretKey) {
      throw new Error('SendCloud credentials not configured');
    }

    const auth = btoa(`${sendcloudPublicKey}:${sendcloudSecretKey}`);

    // Create parcel in SendCloud
    const parcelPayload = {
      parcel: {
        name: shippingAddress.name || shippingAddress.fullName,
        company_name: shippingAddress.company || '',
        address: shippingAddress.address || shippingAddress.street,
        address_2: shippingAddress.address2 || '',
        city: shippingAddress.city,
        postal_code: shippingAddress.postalCode || shippingAddress.zipCode,
        country: shippingAddress.country,
        telephone: shippingAddress.phone || '',
        email: shippingAddress.email || order.buyer_id,
        request_label: true,
        shipment: {
          id: carrierCode ? parseInt(carrierCode) : undefined, // Shipping method ID
          name: carrierCode || 'Standard Shipping'
        },
        weight: Math.round(totalWeight / 1000 * 1000) / 1000, // Convert to kg with 3 decimals
        order_number: order.id,
        insured_value: parseFloat(order.total_amount),
        total_order_value: parseFloat(order.total_amount),
        quantity: order.order_items.length,
        external_reference: order.id,
        service_point_id: servicePointId ? parseInt(servicePointId) : undefined,
        // Sender address (from seller profile or default)
        sender_address: 1, // Use default sender address configured in SendCloud
      }
    };

    console.log('Creating SendCloud parcel:', JSON.stringify(parcelPayload, null, 2));

    const sendcloudResponse = await fetch('https://panel.sendcloud.sc/api/v2/parcels', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(parcelPayload)
    });

    if (!sendcloudResponse.ok) {
      const errorText = await sendcloudResponse.text();
      console.error('SendCloud API error:', errorText);
      throw new Error(`SendCloud API error: ${sendcloudResponse.status} - ${errorText}`);
    }

    const sendcloudData = await sendcloudResponse.json();
    const parcel = sendcloudData.parcel;

    console.log('SendCloud parcel created:', parcel.id);

    // Store parcel info in database
    const { error: parcelError } = await supabaseAdmin
      .from('sendcloud_parcels')
      .insert({
        order_id: orderId,
        sendcloud_id: parcel.id.toString(),
        tracking_number: parcel.tracking_number,
        tracking_url: parcel.tracking_url,
        carrier: parcel.carrier?.name,
        carrier_code: parcel.carrier?.code,
        service_point_id: parcel.service_point_id?.toString(),
        label_url: parcel.label?.label_printer || parcel.label?.normal_printer?.[0],
        status: parcel.status.message,
        status_message: parcel.status.message,
        weight: totalWeight,
        shipment_uuid: parcel.shipment?.uuid,
        external_order_id: parcel.external_order_id,
        external_shipment_id: parcel.external_shipment_id,
        metadata: parcel
      });

    if (parcelError) {
      console.error('Error storing parcel:', parcelError);
      // Continue anyway as label was created
    }

    // Update order with shipping info
    await supabaseAdmin
      .from('orders')
      .update({
        shipping_status: 'label_created',
        tracking_number: parcel.tracking_number,
        carrier: parcel.carrier?.name,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    // Send notification to buyer
    await supabaseAdmin.functions.invoke('send-shipping-notification', {
      body: {
        orderId,
        trackingNumber: parcel.tracking_number,
        carrier: parcel.carrier?.name,
        trackingUrl: parcel.tracking_url
      }
    });

    return new Response(JSON.stringify({
      success: true,
      parcel: {
        id: parcel.id,
        trackingNumber: parcel.tracking_number,
        trackingUrl: parcel.tracking_url,
        labelUrl: parcel.label?.label_printer || parcel.label?.normal_printer?.[0],
        carrier: parcel.carrier?.name,
        status: parcel.status.message
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Create label error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to create shipping label' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});