import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PriceDrop {
  listing_id: string;
  old_price: number;
  new_price: number;
  discount_percentage: number;
  listing: any;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authenticated user
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

    console.log('Checking price drops for user:', user.id);

    // Get user's saved listings (we'll use the saves column on listings as a proxy)
    // In a real implementation, you'd have a saved_listings table
    const { data: savedListings, error: savedError } = await supabase
      .from('listings')
      .select('id, title, brand, seller_price, saves')
      .eq('status', 'active')
      .gt('saves', 0);

    if (savedError) {
      console.error('Error fetching saved listings:', savedError);
      throw savedError;
    }

    if (!savedListings || savedListings.length === 0) {
      return new Response(
        JSON.stringify({ success: true, data: { priceDrops: [] } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get recent price changes from buyer_agent_activities
    const { data: recentActivities, error: activitiesError } = await supabase
      .from('buyer_agent_activities')
      .select('*')
      .eq('user_id', user.id)
      .eq('activity_type', 'price_drop')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (activitiesError) {
      console.error('Error fetching activities:', activitiesError);
    }

    const recentlyNotifiedIds = new Set(
      (recentActivities || []).flatMap((a: any) => 
        (a.listing_ids as string[]) || []
      )
    );

    // Simulate price drop detection
    // In production, you'd track historical prices
    const priceDrops: PriceDrop[] = [];

    for (const listing of savedListings) {
      // Skip if already notified recently
      if (recentlyNotifiedIds.has(listing.id)) {
        continue;
      }

      // Simulate price drop (in production, compare with historical price)
      // For demo: randomly detect 20% of listings as having price drops
      if (Math.random() < 0.2) {
        const oldPrice = listing.seller_price * 1.15; // Simulate old price
        const discountPercentage = ((oldPrice - listing.seller_price) / oldPrice) * 100;

        priceDrops.push({
          listing_id: listing.id,
          old_price: oldPrice,
          new_price: listing.seller_price,
          discount_percentage: Math.round(discountPercentage),
          listing,
        });
      }
    }

    // Create activity records for detected price drops
    if (priceDrops.length > 0) {
      const { error: insertError } = await supabase
        .from('buyer_agent_activities')
        .insert(
          priceDrops.map(drop => ({
            user_id: user.id,
            activity_type: 'price_drop',
            listing_ids: [drop.listing_id],
            reasoning: `Price dropped by ${drop.discount_percentage}%`,
            notified_at: new Date().toISOString(),
          }))
        );

      if (insertError) {
        console.error('Error inserting activities:', insertError);
      }
    }

    console.log(`Found ${priceDrops.length} price drops`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          priceDrops,
          count: priceDrops.length,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in price drop detector:', error);
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
