import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeoLocationResponse {
  country?: string;
  city?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
}

async function getGeoLocation(ip: string): Promise<GeoLocationResponse> {
  try {
    // Using free ip-api.com service (15 requests per minute limit)
    const response = await fetch(`http://ip-api.com/json/${ip}`);
    const data = await response.json();
    
    if (data.status === 'success') {
      return {
        country: data.country,
        city: data.city,
        region: data.regionName,
        latitude: data.lat,
        longitude: data.lon,
      };
    }
    return {};
  } catch (error) {
    console.error('Error getting geolocation:', error);
    return {};
  }
}

function parseUserAgent(userAgent: string) {
  const deviceType = /mobile/i.test(userAgent) ? 'mobile' : 
                     /tablet/i.test(userAgent) ? 'tablet' : 'desktop';
  
  let browser = 'Unknown';
  if (/chrome/i.test(userAgent)) browser = 'Chrome';
  else if (/safari/i.test(userAgent)) browser = 'Safari';
  else if (/firefox/i.test(userAgent)) browser = 'Firefox';
  else if (/edge/i.test(userAgent)) browser = 'Edge';
  
  return { deviceType, browser };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization')!;
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get IP address from headers
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
               req.headers.get('x-real-ip') || 
               'unknown';

    // Get user agent
    const userAgent = req.headers.get('user-agent') || 'Unknown';
    const { deviceType, browser } = parseUserAgent(userAgent);

    // Get geolocation data
    const geoData = await getGeoLocation(ip);

    // Mark previous sessions as inactive
    await supabase
      .from('user_sessions')
      .update({ is_active: false })
      .eq('user_id', user.id)
      .eq('is_active', true);

    // Create new session
    const { error: sessionError } = await supabase
      .from('user_sessions')
      .insert({
        user_id: user.id,
        ip_address: ip,
        country: geoData.country,
        city: geoData.city,
        region: geoData.region,
        latitude: geoData.latitude,
        longitude: geoData.longitude,
        user_agent: userAgent,
        device_type: deviceType,
        browser: browser,
        login_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
        is_active: true,
      });

    if (sessionError) {
      throw sessionError;
    }

    // Update profile with last known location
    await supabase
      .from('profiles')
      .update({
        last_ip_address: ip,
        last_country: geoData.country,
        last_city: geoData.city,
      })
      .eq('id', user.id);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error tracking session:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});