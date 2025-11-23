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

    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Calculating trust score for user:', userId);

    // Fetch ratings received
    const { data: ratingsReceived, error: ratingsError } = await supabaseClient
      .from('ratings')
      .select('rating')
      .eq('reviewee_id', userId);

    if (ratingsError) throw ratingsError;

    // Fetch verified verifications
    const { data: verifications, error: verificationsError } = await supabaseClient
      .from('seller_verifications')
      .select('verification_type, status')
      .eq('seller_id', userId)
      .eq('status', 'verified');

    if (verificationsError) throw verificationsError;

    // Fetch disputes (as seller)
    const { data: disputes, error: disputesError } = await supabaseClient
      .from('disputes')
      .select('status')
      .eq('seller_id', userId);

    if (disputesError) throw disputesError;

    // Fetch completed orders (as seller)
    const { data: orders, error: ordersError } = await supabaseClient
      .from('orders')
      .select('status, created_at')
      .eq('seller_id', userId)
      .eq('status', 'paid');

    if (ordersError) throw ordersError;

    // Fetch reports against user
    const { data: reports, error: reportsError } = await supabaseClient
      .from('reports')
      .select('status')
      .eq('reported_user_id', userId);

    if (reportsError) throw reportsError;

    // Calculate trust score components
    let trustScore = 50; // Base score

    // 1. Average rating (weight: 30 points)
    if (ratingsReceived && ratingsReceived.length > 0) {
      const avgRating = ratingsReceived.reduce((sum, r) => sum + r.rating, 0) / ratingsReceived.length;
      trustScore += ((avgRating - 3) / 2) * 30; // Scale from -30 to +30
    }

    // 2. Dispute ratio (weight: -20 points)
    if (orders && orders.length > 0) {
      const disputeRatio = disputes ? disputes.length / orders.length : 0;
      trustScore -= disputeRatio * 20;
    }

    // 3. Completed orders (weight: +20 points max)
    if (orders) {
      const orderBonus = Math.min(orders.length * 2, 20);
      trustScore += orderBonus;
    }

    // 4. Reports against (weight: -10 per report)
    if (reports) {
      const pendingReports = reports.filter(r => r.status === 'pending' || r.status === 'under_review');
      trustScore -= pendingReports.length * 10;
    }

    // 5. Account age (weight: +10 points for 1+ year)
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('created_at, stripe_onboarding_complete')
      .eq('id', userId)
      .single();

    if (profile?.created_at) {
      const accountAgeMonths = (new Date().getTime() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (accountAgeMonths >= 12) {
        trustScore += 10;
      } else if (accountAgeMonths >= 6) {
        trustScore += 5;
      }
    }

    // 6. Verifications (weight: up to +30 points)
    if (verifications) {
      const verificationTypes = verifications.map(v => v.verification_type);
      if (verificationTypes.includes('email')) trustScore += 5;
      if (verificationTypes.includes('phone')) trustScore += 5;
      if (verificationTypes.includes('id')) trustScore += 15;
      if (verificationTypes.includes('business')) trustScore += 10;
    }

    // Check Stripe Connect verification
    if (profile?.stripe_onboarding_complete) {
      trustScore += 10;
    }

    // Clamp score between 0 and 100
    trustScore = Math.max(0, Math.min(100, Math.round(trustScore)));

    // Update user profile with new trust score
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({ trust_score: trustScore })
      .eq('id', userId);

    if (updateError) throw updateError;

    console.log('Trust score updated:', trustScore);

    return new Response(
      JSON.stringify({
        success: true,
        trustScore,
        breakdown: {
          ratingsCount: ratingsReceived?.length || 0,
          disputesCount: disputes?.length || 0,
          ordersCount: orders?.length || 0,
          reportsCount: reports?.length || 0,
          verificationsCount: verifications?.length || 0,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error calculating trust score:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
