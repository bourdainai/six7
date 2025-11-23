import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

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

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user) {
      throw new Error('Not authenticated');
    }

    const { code } = await req.json();

    if (!code) {
      throw new Error('Verification code is required');
    }

    // Get verification code from database
    const { data: verification, error: fetchError } = await supabaseClient
      .from('phone_verification_codes')
      .select('*')
      .eq('user_id', user.id)
      .eq('code', code)
      .eq('verified', false)
      .single();

    if (fetchError || !verification) {
      throw new Error('Invalid or expired verification code');
    }

    // Check if code is expired
    if (new Date(verification.expires_at) < new Date()) {
      throw new Error('Verification code has expired');
    }

    // Mark code as verified
    const { error: updateCodeError } = await supabaseClient
      .from('phone_verification_codes')
      .update({ verified: true })
      .eq('user_id', user.id)
      .eq('code', code);

    if (updateCodeError) {
      console.error('Error updating verification code:', updateCodeError);
      throw updateCodeError;
    }

    // Update profile with phone verification
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .update({ 
        phone_number: verification.phone_number,
        phone_verified: true 
      })
      .eq('id', user.id);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      throw profileError;
    }

    // Add to seller_verifications table
    const { error: verificationError } = await supabaseClient
      .from('seller_verifications')
      .upsert({
        seller_id: user.id,
        verification_type: 'phone',
        status: 'verified',
        verified_at: new Date().toISOString()
      });

    if (verificationError) {
      console.error('Error updating seller verification:', verificationError);
      throw verificationError;
    }

    console.log('Phone verification completed for user:', user.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Phone verified successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in verify-phone-code:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});