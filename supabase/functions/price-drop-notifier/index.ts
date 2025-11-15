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

    console.log('Starting price drop detection...');

    // Get all users with saved listings
    const { data: searchHistory, error: historyError } = await supabase
      .from('search_history')
      .select('user_id, clicked_listings')
      .not('clicked_listings', 'is', null)
      .order('created_at', { ascending: false });

    if (historyError) throw historyError;

    // Extract unique user-listing pairs from search history
    const userListingPairs = new Map<string, Set<string>>();
    
    searchHistory.forEach(history => {
      if (history.clicked_listings && Array.isArray(history.clicked_listings)) {
        if (!userListingPairs.has(history.user_id)) {
          userListingPairs.set(history.user_id, new Set());
        }
        history.clicked_listings.forEach(listingId => {
          userListingPairs.get(history.user_id)?.add(listingId);
        });
      }
    });

    console.log(`Checking price drops for ${userListingPairs.size} users`);

    let notificationsCreated = 0;

    for (const [userId, listingIds] of userListingPairs) {
      const listingIdArray = Array.from(listingIds);
      
      // Get listings that are still active
      const { data: listings, error: listingsError } = await supabase
        .from('listings')
        .select('id, title, seller_price, suggested_price')
        .in('id', listingIdArray)
        .eq('status', 'active');

      if (listingsError) continue;

      // Check for price drops (when seller_price is now below suggested_price)
      const priceDrops = listings.filter(listing => 
        listing.suggested_price && listing.seller_price < listing.suggested_price
      );

      if (priceDrops.length > 0) {
        // Create notification activity
        await supabase
          .from('buyer_agent_activities')
          .insert({
            user_id: userId,
            activity_type: 'price_drop',
            listing_ids: priceDrops.map(l => l.id),
            reasoning: `${priceDrops.length} items you viewed have dropped in price`,
            fit_score: 85
          });

        notificationsCreated++;
      }
    }

    console.log(`Price drop detection complete. Created ${notificationsCreated} notifications`);

    return new Response(
      JSON.stringify({
        success: true,
        notificationsCreated
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Price drop detection failed:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
