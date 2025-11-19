import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

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
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { targetListingId, cashAmount, tradeItems, photos } = await req.json();
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) throw new Error('Invalid user token');

    // Validate target listing
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('seller_id, status')
      .eq('id', targetListingId)
      .single();

    if (listingError || !listing) throw new Error('Listing not found');
    if (listing.status !== 'active') throw new Error('Listing not active');
    if (listing.seller_id === user.id) throw new Error('Cannot trade with yourself');

    // Trigger AI Valuation (Async or sync? For now sync call or just placeholder)
    // We'll assume we call another function or calculate it here
    // For MVP, just set a placeholder valuation
    const valuations = tradeItems.map((item: any) => ({ ...item, valuation: 100 })); // Mock valuation

    // Trigger Fairness Score
    // Mock score
    const fairnessScore = 0.85; 

    const { data: offer, error: offerError } = await supabase
      .from('trade_offers')
      .insert({
        buyer_id: user.id,
        seller_id: listing.seller_id,
        target_listing_id: targetListingId,
        cash_amount: cashAmount,
        trade_items: tradeItems,
        trade_item_valuations: valuations,
        photos: photos,
        ai_fairness_score: fairnessScore,
        status: 'pending',
        expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      })
      .select()
      .single();

    if (offerError) throw offerError;

    // Send Notification to Seller (via another function or db trigger)
    // supabase.functions.invoke('send-notification', ...)

    return new Response(
      JSON.stringify({ success: true, offerId: offer.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

