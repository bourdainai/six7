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

    const { timeframe = '30d' } = await req.json();

    let startDate = new Date();
    switch (timeframe) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    // Fetch shipping data
    const { data: parcels, error } = await supabase
      .from('sendcloud_parcels')
      .select(`
        *,
        order:orders(
          total_amount,
          seller_id,
          buyer_id
        )
      `)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Calculate metrics
    const totalCost = parcels.reduce((sum, p) => sum + (p.shipping_cost || 0), 0);
    const avgCostPerShipment = parcels.length > 0 ? totalCost / parcels.length : 0;

    // Group by carrier
    const carrierStats = parcels.reduce((acc: any, parcel) => {
      const carrier = parcel.carrier || 'Unknown';
      if (!acc[carrier]) {
        acc[carrier] = {
          count: 0,
          totalCost: 0,
          delivered: 0,
          failed: 0,
        };
      }
      acc[carrier].count++;
      acc[carrier].totalCost += parcel.shipping_cost || 0;
      if (parcel.status === 'delivered') acc[carrier].delivered++;
      if (parcel.status === 'delivery_failed') acc[carrier].failed++;
      return acc;
    }, {});

    // Calculate carrier performance
    const carrierPerformance = Object.entries(carrierStats).map(([carrier, stats]: [string, any]) => ({
      carrier,
      shipments: stats.count,
      totalCost: stats.totalCost,
      avgCost: stats.count > 0 ? stats.totalCost / stats.count : 0,
      successRate: stats.count > 0 ? (stats.delivered / stats.count) * 100 : 0,
      failureRate: stats.count > 0 ? (stats.failed / stats.count) * 100 : 0,
    }));

    // Calculate daily costs
    const dailyCosts = parcels.reduce((acc: any, parcel) => {
      const date = new Date(parcel.created_at).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = 0;
      }
      acc[date] += parcel.shipping_cost || 0;
      return acc;
    }, {});

    const costTrend = Object.entries(dailyCosts).map(([date, cost]) => ({
      date,
      cost,
    }));

    // Top sellers by shipping volume
    const sellerVolume = parcels.reduce((acc: any, parcel) => {
      if (parcel.order?.seller_id) {
        const sellerId = parcel.order.seller_id;
        if (!acc[sellerId]) {
          acc[sellerId] = {
            shipments: 0,
            totalCost: 0,
          };
        }
        acc[sellerId].shipments++;
        acc[sellerId].totalCost += parcel.shipping_cost || 0;
      }
      return acc;
    }, {});

    const topSellers = Object.entries(sellerVolume)
      .map(([sellerId, data]: [string, any]) => ({
        sellerId,
        ...data,
      }))
      .sort((a, b) => b.shipments - a.shipments)
      .slice(0, 10);

    return new Response(
      JSON.stringify({
        summary: {
          totalShipments: parcels.length,
          totalCost: totalCost.toFixed(2),
          avgCostPerShipment: avgCostPerShipment.toFixed(2),
          timeframe,
        },
        carrierPerformance,
        costTrend,
        topSellers,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Shipping analytics error:', error);
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
