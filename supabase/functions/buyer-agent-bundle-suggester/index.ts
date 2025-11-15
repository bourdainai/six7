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

    const { listingId } = await req.json();

    if (!listingId) {
      throw new Error('listingId is required');
    }

    console.log('Finding bundle suggestions for listing:', listingId);

    // Get the target listing
    const { data: targetListing, error: listingError } = await supabase
      .from('listings')
      .select('*, profiles!listings_seller_id_fkey(full_name, country)')
      .eq('id', listingId)
      .single();

    if (listingError || !targetListing) {
      throw new Error('Listing not found');
    }

    // Get user preferences
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Find other items from the same seller that match user preferences
    const { data: candidateListings, error: candidatesError } = await supabase
      .from('listings')
      .select('*')
      .eq('seller_id', targetListing.seller_id)
      .eq('status', 'active')
      .neq('id', listingId)
      .limit(10);

    if (candidatesError) {
      console.error('Error fetching candidate listings:', candidatesError);
      throw candidatesError;
    }

    if (!candidateListings || candidateListings.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          data: { bundles: [] },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Score and filter candidates
    const scoredCandidates = candidateListings
      .map(listing => {
        let score = 50; // Base score

        // Check if matches user preferences
        if (preferences) {
          const prefSizes = preferences.sizes as string[] || [];
          const prefCategories = preferences.categories as string[] || [];
          const prefBrands = preferences.brands as string[] || [];

          if (listing.size && prefSizes.includes(listing.size)) score += 20;
          if (listing.category && prefCategories.includes(listing.category)) score += 15;
          if (listing.brand && prefBrands.includes(listing.brand)) score += 15;
        }

        // Same category as target listing
        if (listing.category === targetListing.category) score += 10;

        return { listing, score };
      })
      .filter(item => item.score >= 60)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    // Calculate bundle savings
    const bundles = scoredCandidates.map(({ listing, score }) => {
      const totalPrice = targetListing.seller_price + listing.seller_price;
      const shippingSavings = 5.99; // Flat rate saved
      const bundleDiscount = totalPrice * 0.05; // 5% bundle discount
      const totalSavings = shippingSavings + bundleDiscount;

      return {
        items: [targetListing, listing],
        total_price: totalPrice,
        original_shipping: 5.99 * 2,
        bundle_shipping: 5.99,
        shipping_savings: shippingSavings,
        bundle_discount: bundleDiscount,
        total_savings: totalSavings,
        final_price: totalPrice - bundleDiscount + 5.99,
        fit_score: score,
        reasoning: `Save £${totalSavings.toFixed(2)} by bundling with another item from ${targetListing.profiles?.full_name || 'this seller'}`,
      };
    });

    // Record activity
    if (bundles.length > 0) {
      await supabase
        .from('buyer_agent_activities')
        .insert({
          user_id: user.id,
          activity_type: 'bundle_suggestion',
          listing_ids: [listingId, ...bundles[0].items.map((i: any) => i.id)],
          fit_score: bundles[0].fit_score,
          reasoning: bundles[0].reasoning,
        });
    }

    console.log(`Found ${bundles.length} bundle suggestions`);

    return new Response(
      JSON.stringify({
        success: true,
        data: { bundles },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in bundle suggester:', error);
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
