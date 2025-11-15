import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    console.log('Starting stale inventory detection...');

    // Get all active listings that haven't been updated in 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: staleListings, error: listingsError } = await supabase
      .from('listings')
      .select('id, seller_id, title, created_at, last_view_at, views, saves')
      .eq('status', 'active')
      .lt('created_at', thirtyDaysAgo.toISOString());

    if (listingsError) throw listingsError;

    console.log(`Found ${staleListings.length} potentially stale listings`);

    let alertsCreated = 0;

    for (const listing of staleListings) {
      const daysSinceCreated = Math.floor(
        (Date.now() - new Date(listing.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      const daysSinceView = listing.last_view_at
        ? Math.floor((Date.now() - new Date(listing.last_view_at).getTime()) / (1000 * 60 * 60 * 24))
        : daysSinceCreated;

      // Calculate stale risk score
      let staleRiskScore = 0;
      
      if (daysSinceCreated > 90) staleRiskScore += 40;
      else if (daysSinceCreated > 60) staleRiskScore += 30;
      else if (daysSinceCreated > 30) staleRiskScore += 20;

      if (daysSinceView > 30) staleRiskScore += 30;
      else if (daysSinceView > 14) staleRiskScore += 20;

      if (listing.views < 10) staleRiskScore += 20;
      if (listing.saves === 0) staleRiskScore += 10;

      // Update listing with stale risk score
      if (staleRiskScore >= 50) {
        await supabase
          .from('listings')
          .update({ stale_risk_score: staleRiskScore })
          .eq('id', listing.id);

        // Create buyer agent activity for seller notification
        await supabase
          .from('buyer_agent_activities')
          .insert({
            user_id: listing.seller_id,
            activity_type: 'stale_inventory',
            listing_ids: [listing.id],
            reasoning: `Listing "${listing.title}" has been active for ${daysSinceCreated} days with ${listing.views} views and ${listing.saves} saves. Consider reducing price or improving listing.`,
            fit_score: staleRiskScore
          });

        alertsCreated++;
      }
    }

    console.log(`Stale inventory detection complete. Created ${alertsCreated} alerts`);

    return new Response(
      JSON.stringify({
        success: true,
        staleListings: staleListings.length,
        alertsCreated
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Stale inventory detection failed:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
