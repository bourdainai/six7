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

    const { phoneNumber } = await req.json();

    if (!phoneNumber) {
      throw new Error('Phone number is required');
    }

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Store code in database with expiry (10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    
    const { error: dbError } = await supabaseClient
      .from('phone_verification_codes')
      .upsert({
        user_id: user.id,
        phone_number: phoneNumber,
        code: verificationCode,
        expires_at: expiresAt,
        verified: false
      });

    if (dbError) {
      console.error('Database error:', dbError);
      throw dbError;
    }

    // Send SMS via Bird.com
    const birdApiKey = Deno.env.get('BIRD_API_KEY');
    const birdResponse = await fetch('https://api.bird.com/workspaces/YOUR_WORKSPACE_ID/channels/sms/messages', {
      method: 'POST',
      headers: {
        'Authorization': `AccessKey ${birdApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        receiver: {
          contacts: [{
            identifierValue: phoneNumber
          }]
        },
        body: {
          type: 'text',
          text: {
            text: `Your 6Seven verification code is: ${verificationCode}. Valid for 10 minutes.`
          }
        }
      })
    });

    if (!birdResponse.ok) {
      const errorText = await birdResponse.text();
      console.error('Bird.com API error:', errorText);
      throw new Error(`Failed to send SMS: ${errorText}`);
    }

    console.log('Verification code sent successfully to:', phoneNumber);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Verification code sent successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-phone-verification:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});