import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get request body
    const { activity_type, metadata } = await req.json();

    // Get IP address from request headers
    const ip_address = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                       req.headers.get('x-real-ip') || 
                       'unknown';

    // Get location from IP using ipapi.co (free tier)
    let city = null;
    let country = null;
    
    if (ip_address !== 'unknown') {
      try {
        const locationResponse = await fetch(`https://ipapi.co/${ip_address}/json/`);
        if (locationResponse.ok) {
          const locationData = await locationResponse.json();
          city = locationData.city || null;
          country = locationData.country_name || null;
        }
      } catch (error) {
        console.error('Error fetching location:', error);
      }
    }

    // Log the activity
    const { error: logError } = await supabase
      .from('user_activity_logs')
      .insert({
        user_id: user.id,
        activity_type,
        ip_address,
        city,
        country,
        metadata: metadata || {}
      });

    if (logError) throw logError;

    // Update profile with last location
    await supabase
      .from('profiles')
      .update({
        last_ip_address: ip_address,
        last_city: city,
        last_country: country,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Activity tracking error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
