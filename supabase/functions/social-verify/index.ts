import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { provider, profileData } = await req.json();

    console.log(`Processing ${provider} verification for user ${user.id}`);

    // Extract relevant data based on provider
    let connectionCount = 0;
    let profileAgeYears = 0;
    let providerUserId = '';

    if (provider === 'linkedin_oidc' || provider === 'linkedin') {
      // LinkedIn profile data
      providerUserId = profileData.sub || profileData.id || '';
      // LinkedIn doesn't expose connection count via OAuth, estimate based on profile completeness
      connectionCount = profileData.email && profileData.name ? 100 : 50;
    } else if (provider === 'facebook') {
      providerUserId = profileData.id || '';
      // Facebook basic profile
      connectionCount = 50; // Placeholder
    } else if (provider === 'instagram') {
      providerUserId = profileData.id || profileData.username || '';
      connectionCount = 50;
    } else if (provider === 'twitter') {
      providerUserId = profileData.id || profileData.username || '';
      connectionCount = profileData.public_metrics?.followers_count || 0;
    }

    // Store social verification
    const { data: socialVerification, error: socialError } = await supabaseClient
      .from('social_verifications')
      .upsert({
        user_id: user.id,
        provider: provider === 'linkedin_oidc' ? 'linkedin' : provider,
        provider_user_id: providerUserId,
        profile_data: profileData,
        connection_count: connectionCount,
        verified_at: new Date().toISOString(),
        last_validated: new Date().toISOString(),
      }, {
        onConflict: 'user_id,provider',
      })
      .select()
      .single();

    if (socialError) {
      console.error('Error storing social verification:', socialError);
      throw socialError;
    }

    // Update profiles table
    const providerColumn = `${provider === 'linkedin_oidc' ? 'linkedin' : provider}_verified`;
    await supabaseClient
      .from('profiles')
      .update({ [providerColumn]: true })
      .eq('id', user.id);

    // Create seller_verifications record
    await supabaseClient
      .from('seller_verifications')
      .upsert({
        seller_id: user.id,
        verification_type: provider === 'linkedin_oidc' ? 'linkedin' : provider,
        status: 'verified',
        verified_at: new Date().toISOString(),
        verification_data: {
          provider_user_id: providerUserId,
          connection_count: connectionCount,
        },
      }, {
        onConflict: 'seller_id,verification_type',
      });

    // Trigger trust score recalculation
    await supabaseClient.functions.invoke('calculate-trust-score', {
      body: { userId: user.id },
    });

    console.log(`Successfully verified ${provider} for user ${user.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        provider: provider === 'linkedin_oidc' ? 'linkedin' : provider,
        verification: socialVerification,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in social verification:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});