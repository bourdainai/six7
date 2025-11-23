import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GetRatesRequest {
  toCountry: string;
  toPostalCode: string;
  toCity: string;
  weight: number; // in grams
  declaredValue?: number;
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

    const { toCountry, toPostalCode, toCity, weight, declaredValue }: GetRatesRequest = await req.json();

    // Check cache first
    const cacheKey = `${toCountry}-${toPostalCode}-${weight}`;
    const { data: cachedRates } = await supabaseAdmin
      .from('shipping_rates_cache')
      .select('*')
      .eq('to_country', toCountry)
      .eq('to_postal_code', toPostalCode)
      .eq('weight', weight)
      .gt('expires_at', new Date().toISOString())
      .limit(10);

    if (cachedRates && cachedRates.length > 0) {
      console.log('Returning cached rates');
      return new Response(JSON.stringify({
        rates: cachedRates.map(r => ({
          carrierCode: r.carrier_code,
          rate: parseFloat(r.rate),
          currency: r.currency,
          estimatedDays: r.estimated_days,
          metadata: r.metadata
        })),
        cached: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch from SendCloud API
    const sendcloudPublicKey = Deno.env.get('SENDCLOUD_PUBLIC_KEY');
    const sendcloudSecretKey = Deno.env.get('SENDCLOUD_SECRET_KEY');

    if (!sendcloudPublicKey || !sendcloudSecretKey) {
      throw new Error('SendCloud credentials not configured');
    }

    const auth = btoa(`${sendcloudPublicKey}:${sendcloudSecretKey}`);

    // Get shipping methods from SendCloud
    const shippingMethodsResponse = await fetch(
      `https://panel.sendcloud.sc/api/v2/shipping_methods?to_country=${toCountry}&weight=${weight / 1000}&sender_address=1`,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        }
      }
    );

    if (!shippingMethodsResponse.ok) {
      const errorText = await shippingMethodsResponse.text();
      console.error('SendCloud API error:', errorText);
      throw new Error(`Failed to fetch shipping methods: ${shippingMethodsResponse.status}`);
    }

    const shippingMethodsData = await shippingMethodsResponse.json();
    const shippingMethods = shippingMethodsData.shipping_methods || [];

    console.log(`Found ${shippingMethods.length} shipping methods`);

    // Filter and format rates
    const rates = shippingMethods
      .filter((method: any) => method.countries.some((c: any) => c.iso_2 === toCountry))
      .map((method: any) => {
        const countryConfig = method.countries.find((c: any) => c.iso_2 === toCountry);
        return {
          carrierCode: method.id.toString(),
          carrierName: method.carrier,
          serviceName: method.name,
          rate: parseFloat(countryConfig?.price || method.price || 0),
          currency: 'GBP',
          estimatedDays: method.max_weight ? 3 : 5, // Estimate based on method type
          minDeliveryDays: method.min_delivery_days,
          maxDeliveryDays: method.max_delivery_days,
          metadata: {
            carrier: method.carrier,
            service: method.name,
            minWeight: method.min_weight,
            maxWeight: method.max_weight,
            countries: method.countries.map((c: any) => c.iso_2)
          }
        };
      })
      .sort((a: any, b: any) => a.rate - b.rate); // Sort by price

    // Cache the rates for 1 hour
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    const cacheInserts = rates.map((rate: any) => ({
      from_country: 'GB', // Assuming UK as default
      from_postal_code: '', // Will be set based on seller
      to_country: toCountry,
      to_postal_code: toPostalCode,
      weight,
      carrier_code: rate.carrierCode,
      rate: rate.rate,
      currency: rate.currency,
      estimated_days: rate.estimatedDays,
      metadata: rate.metadata,
      expires_at: expiresAt.toISOString()
    }));

    if (cacheInserts.length > 0) {
      await supabaseAdmin
        .from('shipping_rates_cache')
        .insert(cacheInserts)
        .select();
    }

    return new Response(JSON.stringify({
      rates,
      cached: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Get rates error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to fetch shipping rates',
        rates: [] // Return empty rates on error
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});