import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ServicePointRequest {
  country: string;
  postalCode: string;
  city?: string;
  carrierCode?: string;
  weight?: number;
  radius?: number; // in meters, default 5000
  limit?: number; // max results, default 10
}

Deno.serve(async (req) => {
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
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const body: ServicePointRequest = await req.json();
    console.log('Service point request:', JSON.stringify(body));

    const { country, postalCode, city, carrierCode, weight, radius = 5000, limit = 10 } = body;

    if (!country || !postalCode) {
      throw new Error('Country and postal code are required');
    }

    const sendcloudPublicKey = Deno.env.get('SENDCLOUD_PUBLIC_KEY');
    const sendcloudSecretKey = Deno.env.get('SENDCLOUD_SECRET_KEY');

    if (!sendcloudPublicKey || !sendcloudSecretKey) {
      throw new Error('Sendcloud credentials not configured');
    }

    const auth = btoa(`${sendcloudPublicKey}:${sendcloudSecretKey}`);

    // Build query parameters
    const params = new URLSearchParams({
      country,
      postal_code: postalCode,
      radius: radius.toString(),
      limit: limit.toString(),
    });

    if (city) params.append('city', city);
    if (carrierCode) params.append('carrier', carrierCode);
    if (weight) params.append('weight', weight.toString());

    const response = await fetch(
      `https://panel.sendcloud.sc/api/v2/service-points?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Sendcloud service points error:', errorText);
      throw new Error(`Sendcloud API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`Found ${data.length} service points`);

    // Transform to our format
    const servicePoints = data.map((sp: any) => ({
      id: sp.id,
      code: sp.code,
      name: sp.name,
      carrier: sp.carrier,
      street: sp.street,
      houseNumber: sp.house_number,
      postalCode: sp.postal_code,
      city: sp.city,
      country: sp.country,
      latitude: sp.latitude,
      longitude: sp.longitude,
      phone: sp.phone,
      email: sp.email,
      openingHours: sp.opening_hours,
      distance: sp.distance,
      isPickupPoint: sp.is_pickup_point,
    }));

    return new Response(
      JSON.stringify({ servicePoints }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Service points error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to fetch service points',
        servicePoints: []
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
