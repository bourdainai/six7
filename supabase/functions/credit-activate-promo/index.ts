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

    const { listingId } = await req.json();

    if (!listingId) {
      throw new Error('Listing ID required');
    }

    // Check if user has a promo that's not yet activated
    const { data: promo, error: promoError } = await supabase
      .from('promotional_signups')
      .select('*')
      .eq('user_id', user.id)
      .is('activated_at', null)
      .single();

    // If no eligible promo, return a graceful 200 response instead of an error
    if (promoError || !promo) {
      console.log('No eligible promo found for user', user.id, { promoError });
      return new Response(
        JSON.stringify({
          success: false,
          reason: 'no_eligible_promo',
          message: 'No promotional credits available for this account.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Activate the promo
    const { error: updatePromoError } = await supabase
      .from('promotional_signups')
      .update({
        first_listing_id: listingId,
        activated_at: new Date().toISOString(),
      })
      .eq('id', promo.id);

    if (updatePromoError) {
      throw updatePromoError;
    }

    // Award credits
    const { data: currentCredits } = await supabase
      .from('seller_credits')
      .select('balance, lifetime_earned')
      .eq('user_id', user.id)
      .single();

    const { error: updateCreditsError } = await supabase
      .from('seller_credits')
      .update({
        balance: (currentCredits?.balance || 0) + promo.credits_awarded,
        lifetime_earned: (currentCredits?.lifetime_earned || 0) + promo.credits_awarded,
      })
      .eq('user_id', user.id);

    if (updateCreditsError) {
      throw updateCreditsError;
    }

    // Log transaction
    await supabase
      .from('credit_transactions')
      .insert({
        user_id: user.id,
        amount: promo.credits_awarded,
        type: 'promotional',
        description: `LAUNCH250 promo activated - First listing created`,
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        creditsAwarded: promo.credits_awarded,
        message: `🎉 ${promo.credits_awarded} credits awarded!` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error activating promo:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});