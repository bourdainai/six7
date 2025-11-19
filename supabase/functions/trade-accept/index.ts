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

    const { offerId } = await req.json();
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) throw new Error('Invalid user token');

    // Get Offer
    const { data: offer } = await supabase
      .from('trade_offers')
      .select('*')
      .eq('id', offerId)
      .single();

    if (!offer) throw new Error('Offer not found');
    
    // Verify user is the recipient (seller of target item OR buyer if counter offer)
    // Simplified: assumes standard flow where seller accepts buyer's offer
    if (offer.seller_id !== user.id) {
      throw new Error('Not authorized to accept this offer');
    }

    // Update Offer Status
    const { error: updateError } = await supabase
      .from('trade_offers')
      .update({ status: 'accepted' })
      .eq('id', offerId);

    if (updateError) throw updateError;

    // Create Orders / Lock Inventory
    // 1. Mark target listing as sold
    await supabase.from('listings').update({ status: 'sold' }).eq('id', offer.target_listing_id);

    // 2. Mark trade items as sold (if they are listings in the system)
    const tradeItems = offer.trade_items;
    for (const item of tradeItems) {
       if (item.listing_id) {
         await supabase.from('listings').update({ status: 'sold' }).eq('id', item.listing_id);
       }
    }

    // 3. Handle Cash Component (Create Payment Intent or Wallet Transfer)
    if (offer.cash_amount > 0) {
      // Logic to charge buyer
      // For now, we assume this triggers a checkout flow or wallet deduction if pre-authorized
    }

    return new Response(
      JSON.stringify({ success: true }),
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

