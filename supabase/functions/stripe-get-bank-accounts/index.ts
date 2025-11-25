import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    });
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    console.log(`Fetching bank accounts for user ${user.id}`);

    // Get user's Stripe Connect account
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_connect_account_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.stripe_connect_account_id) {
      return new Response(
        JSON.stringify({ 
          bankAccounts: [],
          needsOnboarding: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch external accounts (bank accounts) from Stripe Connect
    const externalAccounts = await stripe.accounts.listExternalAccounts(
      profile.stripe_connect_account_id,
      { 
        object: 'bank_account',
        limit: 100 
      }
    );

    const bankAccounts = externalAccounts.data.map((account: any) => ({
      id: account.id,
      bank_name: account.bank_name,
      last4: account.last4,
      currency: account.currency,
      country: account.country,
      default_for_currency: account.default_for_currency,
    }));

    console.log(`Found ${bankAccounts.length} bank accounts`);

    return new Response(
      JSON.stringify({ 
        bankAccounts,
        needsOnboarding: false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        bankAccounts: [],
        needsOnboarding: false
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
