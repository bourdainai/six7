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

    const authHeader = req.headers.get('Authorization')!;
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get user's credit balance
    const { data: credits, error: creditsError } = await supabase
      .from('seller_credits')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (creditsError) {
      throw creditsError;
    }

    // Get promo status
    const { data: promo, error: promoError } = await supabase
      .from('promotional_signups')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    // Check how many promo slots are left
    const { count: promoCount } = await supabase
      .from('promotional_signups')
      .select('*', { count: 'exact', head: true });

    const promoSlotsRemaining = Math.max(0, 250 - (promoCount || 0));

    return new Response(
      JSON.stringify({
        credits: credits || { balance: 0, lifetime_earned: 0, lifetime_used: 0 },
        promo: promo || null,
        promoSlotsRemaining,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error checking credit balance:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});