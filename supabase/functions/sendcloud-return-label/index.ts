import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from "https://esm.sh/stripe@14.21.0";

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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { orderId, reason } = await req.json();

    if (!orderId) {
      throw new Error('orderId is required');
    }

    console.log('Creating return label for order:', orderId);

    // Fetch order details including seller's Stripe Connect account ID
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(
          *,
          listing:listings(title, package_weight, package_dimensions)
        ),
        seller:profiles!seller_id(full_name, email, stripe_connect_account_id),
        buyer:profiles!buyer_id(full_name, email)
      `)
      .eq('id', orderId)
      .single();

    if (orderError) throw orderError;

    // Verify user is buyer
    if (order.buyer_id !== user.id) {
      throw new Error('Unauthorized - not the buyer');
    }

    const sendcloudPublicKey = Deno.env.get('SENDCLOUD_PUBLIC_KEY');
    const sendcloudSecretKey = Deno.env.get('SENDCLOUD_SECRET_KEY');

    if (!sendcloudPublicKey || !sendcloudSecretKey) {
      throw new Error('Sendcloud credentials not configured');
    }

    const auth = btoa(`${sendcloudPublicKey}:${sendcloudSecretKey}`);

    // Calculate total weight
    const totalWeight = order.order_items.reduce((sum: number, item: any) => {
      return sum + (item.listing?.package_weight || 0.5);
    }, 0);

    // Create return parcel - reverse shipping address (buyer to seller)
    const shippingAddress = order.shipping_address as any;

    // Get seller's return address from Stripe Connect account
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
    let sellerReturnAddress = {
      name: order.seller?.full_name || 'Seller',
      company_name: '6SEVEN',
      address: '',
      city: '',
      postal_code: '',
      country: 'GB',
      email: order.seller?.email || '',
      telephone: '',
    };

    // Fetch seller's address from Stripe Connect if available
    if (order.seller?.stripe_connect_account_id && stripeKey) {
      try {
        const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
        const stripeAccount = await stripe.accounts.retrieve(order.seller.stripe_connect_account_id);

        // Use business profile address or individual address
        const address = stripeAccount.business_profile?.support_address ||
                       (stripeAccount.individual as any)?.address ||
                       (stripeAccount.company as any)?.address;

        if (address) {
          sellerReturnAddress = {
            name: order.seller?.full_name || stripeAccount.business_profile?.name || 'Seller',
            company_name: stripeAccount.business_profile?.name || '6SEVEN',
            address: address.line1 || '',
            city: address.city || '',
            postal_code: address.postal_code || '',
            country: address.country || 'GB',
            email: order.seller?.email || '',
            telephone: stripeAccount.business_profile?.support_phone || '',
          };
        }
        console.log('Fetched seller address from Stripe:', sellerReturnAddress.city);
      } catch (stripeError) {
        console.error('Failed to fetch seller address from Stripe:', stripeError);
        // Fall back to requiring manual address entry
        throw new Error('Seller return address not available. Please contact support.');
      }
    } else {
      throw new Error('Seller has not completed payment setup. Return label cannot be generated.');
    }

    // Validate we have a proper address
    if (!sellerReturnAddress.address || !sellerReturnAddress.city || !sellerReturnAddress.postal_code) {
      throw new Error('Seller return address is incomplete. Please contact support.');
    }

    const parcelData = {
      parcel: {
        name: shippingAddress.name,
        company_name: shippingAddress.company || '',
        address: shippingAddress.address,
        address_2: shippingAddress.address2 || '',
        city: shippingAddress.city,
        postal_code: shippingAddress.postalCode,
        country: shippingAddress.country,
        email: order.buyer?.email,
        telephone: shippingAddress.phone || '',
        request_label: true,
        shipment: {
          name: sellerReturnAddress.name,
          company_name: sellerReturnAddress.company_name,
          address: sellerReturnAddress.address,
          city: sellerReturnAddress.city,
          postal_code: sellerReturnAddress.postal_code,
          country: sellerReturnAddress.country,
          email: sellerReturnAddress.email,
          telephone: sellerReturnAddress.telephone,
        },
        weight: String(Math.max(totalWeight, 0.1)),
        order_number: orderId.slice(0, 8),
        is_return: true,
        parcel_items: order.order_items.map((item: any) => ({
          description: item.listing?.title || 'Item',
          quantity: 1,
          weight: String(item.listing?.package_weight || 0.5),
          value: String(item.price),
        })),
      },
    };

    console.log('Creating Sendcloud return parcel:', JSON.stringify(parcelData, null, 2));

    const response = await fetch('https://panel.sendcloud.sc/api/v2/parcels', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(parcelData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Sendcloud API error:', errorText);
      throw new Error(`Sendcloud API error: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Return label created:', result);

    // Store return parcel info
    const { error: insertError } = await supabase
      .from('sendcloud_parcels')
      .insert({
        order_id: orderId,
        sendcloud_parcel_id: result.parcel.id.toString(),
        tracking_number: result.parcel.tracking_number,
        label_url: result.parcel.label?.label_printer || result.parcel.label?.normal_printer?.[0],
        status: 'return_requested',
        carrier: result.parcel.carrier?.name,
        is_return: true,
      });

    if (insertError) {
      console.error('Error storing return parcel:', insertError);
      throw insertError;
    }

    // Create return record
    const { error: returnError } = await supabase
      .from('returns')
      .insert({
        order_id: orderId,
        buyer_id: user.id,
        seller_id: order.seller_id,
        reason: reason || 'Return requested',
        status: 'pending',
        tracking_number: result.parcel.tracking_number,
      });

    if (returnError) {
      console.error('Error creating return record:', returnError);
    }

    // Notify seller
    await supabase.functions.invoke('send-notification', {
      body: {
        userId: order.seller_id,
        title: 'Return Label Requested 📦',
        message: `A return label has been generated for order #${orderId.slice(0, 8)}`,
        type: 'return_requested',
        link: `/seller/orders`,
        metadata: { orderId, trackingNumber: result.parcel.tracking_number },
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        parcelId: result.parcel.id,
        trackingNumber: result.parcel.tracking_number,
        labelUrl: result.parcel.label?.label_printer || result.parcel.label?.normal_printer?.[0],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Return label error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
