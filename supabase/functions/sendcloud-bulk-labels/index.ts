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

    const { orderIds, presetId } = await req.json();

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      throw new Error('orderIds must be a non-empty array');
    }

    console.log(`Processing bulk labels for ${orderIds.length} orders`);

    // Fetch all orders
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(
          *,
          listing:listings(title, package_weight, package_dimensions)
        ),
        shipping_details(*)
      `)
      .in('id', orderIds)
      .eq('seller_id', user.id)
      .eq('status', 'paid');

    if (ordersError) throw ordersError;
    if (!orders || orders.length === 0) {
      throw new Error('No eligible orders found');
    }

    // Load shipping preset if provided
    let preset = null;
    if (presetId) {
      const { data: presetData } = await supabase
        .from('shipping_presets')
        .select('*')
        .eq('id', presetId)
        .eq('seller_id', user.id)
        .single();
      
      preset = presetData;
    }

    const results = [];
    const errors = [];

    // Process each order
    for (const order of orders) {
      try {
        // Create label via sendcloud-create-label function
        const { data: labelData, error: labelError } = await supabase.functions.invoke(
          'sendcloud-create-label',
          {
            body: {
              orderId: order.id,
              servicePointId: preset?.default_service_point_id,
              carrierCode: preset?.default_carrier,
              shippingMethodId: preset?.default_shipping_method_id,
            }
          }
        );

        if (labelError) {
          errors.push({ orderId: order.id, error: labelError.message });
        } else {
          results.push({ orderId: order.id, success: true, data: labelData });
        }
      } catch (error) {
        errors.push({ 
          orderId: order.id, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    console.log(`Bulk processing complete: ${results.length} success, ${errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        totalProcessed: orders.length,
        successCount: results.length,
        errorCount: errors.length,
        results,
        errors,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Bulk label error:', error);
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
