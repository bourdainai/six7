import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Check if user already has a Connect account
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('stripe_connect_account_id, stripe_onboarding_complete, marketplace')
      .eq('id', user.id)
      .single();

    let accountId = profile?.stripe_connect_account_id;
    const userMarketplace = profile?.marketplace || 'UK';
    const country = userMarketplace === 'US' ? 'US' : 'GB';

    // Create Connect account if doesn't exist
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: country,
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });

      accountId = account.id;

      // Save account ID to profile
      await supabaseClient
        .from('profiles')
        .update({ stripe_connect_account_id: accountId })
        .eq('id', user.id);

      console.log(`Created Stripe Connect account: ${accountId} for user: ${user.id}`);
    }

    // Create account session for embedded components
    const accountSession = await stripe.accountSessions.create({
      account: accountId,
      components: {
        account_onboarding: { enabled: true },
        account_management: { enabled: true },
      },
    });

    console.log(`Created account session for account: ${accountId}`);

    return new Response(
      JSON.stringify({ 
        clientSecret: accountSession.client_secret,
        accountId: accountId,
        publishableKey: Deno.env.get('STRIPE_PUBLISHABLE_KEY') || null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in stripe-connect-account-session:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
