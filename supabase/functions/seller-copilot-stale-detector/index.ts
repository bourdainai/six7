import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('Analyzing stale inventory for seller:', user.id);

    // Get seller's active listings
    const { data: listings, error: listingsError } = await supabase
      .from('listings')
      .select('id, title, created_at, views, saves, seller_price, last_view_at')
      .eq('seller_id', user.id)
      .eq('status', 'active');

    if (listingsError) {
      console.error('Error fetching listings:', listingsError);
      throw listingsError;
    }

    if (!listings || listings.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          data: { staleListings: [], recommendations: [] },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const oneWeekMs = 7 * oneDayMs;

    // Calculate stale risk score for each listing
    const analyzedListings = listings.map(listing => {
      const daysSinceListed = Math.floor(
        (now - new Date(listing.created_at).getTime()) / oneDayMs
      );
      
      const lastViewDate = listing.last_view_at 
        ? new Date(listing.last_view_at).getTime()
        : new Date(listing.created_at).getTime();
      
      const daysSinceView = Math.floor((now - lastViewDate) / oneDayMs);

      let staleScore = 0;
      let recommendations = [];

      // Time-based scoring
      if (daysSinceListed > 30) staleScore += 30;
      else if (daysSinceListed > 14) staleScore += 20;
      else if (daysSinceListed > 7) staleScore += 10;

      // View activity scoring
      if (daysSinceView > 7) staleScore += 25;
      else if (daysSinceView > 3) staleScore += 15;

      const viewsPerDay = listing.views / Math.max(daysSinceListed, 1);
      if (viewsPerDay < 0.5) staleScore += 25;
      else if (viewsPerDay < 1) staleScore += 15;

      // Saves scoring
      if (listing.saves === 0 && daysSinceListed > 3) staleScore += 20;

      // Generate recommendations
      if (staleScore >= 60) {
        if (daysSinceListed > 21) {
          recommendations.push({
            type: 'price_reduction',
            message: 'Consider reducing price by 10-15%',
            priority: 'high',
          });
        }
        if (listing.views < 10) {
          recommendations.push({
            type: 'improve_listing',
            message: 'Add more photos or improve description',
            priority: 'high',
          });
        }
        if (daysSinceListed > 30) {
          recommendations.push({
            type: 'relist',
            message: 'Consider relisting to refresh visibility',
            priority: 'medium',
          });
        }
      } else if (staleScore >= 40) {
        recommendations.push({
          type: 'promote',
          message: 'Consider promoting or bundling this item',
          priority: 'medium',
        });
      }

      return {
        ...listing,
        stale_risk_score: Math.min(staleScore, 100),
        days_since_listed: daysSinceListed,
        days_since_view: daysSinceView,
        views_per_day: viewsPerDay.toFixed(2),
        recommendations,
      };
    });

    // Update stale risk scores in database
    const updates = analyzedListings.map(listing => ({
      id: listing.id,
      stale_risk_score: listing.stale_risk_score,
    }));

    for (const update of updates) {
      await supabase
        .from('listings')
        .update({ stale_risk_score: update.stale_risk_score })
        .eq('id', update.id);
    }

    // Get stale listings (score >= 50)
    const staleListings = analyzedListings
      .filter(l => l.stale_risk_score >= 50)
      .sort((a, b) => b.stale_risk_score - a.stale_risk_score);

    console.log(`Found ${staleListings.length} stale listings`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          staleListings,
          totalListings: listings.length,
          staleCount: staleListings.length,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in stale detector:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
