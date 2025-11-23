import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const tradeSchema = z.object({
  targetListingId: z.string().uuid('Invalid listing ID format'),
  cashAmount: z.number().min(0, 'Cash amount must be non-negative').max(10000, 'Cash amount too large').optional(),
  tradeItems: z.array(z.object({
    listingId: z.string().uuid(),
    title: z.string().max(200).optional(),
    value: z.number().positive().optional()
  })).max(20, 'Maximum 20 items per trade').optional(),
  photos: z.array(z.string().url()).max(10, 'Maximum 10 photos').optional(),
  notes: z.string().max(500).optional(),
  tradeType: z.enum(['simple', 'multi_card', 'bulk']).optional(),
  aiFairnessScore: z.number().min(0).max(1).optional(),
  aiSuggestions: z.array(z.string()).optional()
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { 
      targetListingId, 
      cashAmount, 
      tradeItems, 
      photos, 
      notes, 
      tradeType, 
      aiFairnessScore, 
      aiSuggestions 
    } = tradeSchema.parse(body);
    
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

    // Use provided valuations or get from items
    const valuations = tradeItems?.map((item: any) => ({ 
      ...item, 
      valuation: item.value || 0 
    })) || [];

    // Use provided fairness score
    const fairnessScore = aiFairnessScore || 0.5;

    const { data: offer, error: offerError } = await supabase
      .from('trade_offers')
      .insert({
        buyer_id: user.id,
        seller_id: listing.seller_id,
        target_listing_id: targetListingId,
        cash_amount: cashAmount || 0,
        trade_items: tradeItems || [],
        trade_item_valuations: valuations,
        photos: photos || [],
        ai_fairness_score: fairnessScore,
        status: 'pending',
        expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        trade_type: tradeType || 'simple',
        requester_notes: notes,
        ai_suggestions: aiSuggestions || [],
        negotiation_round: 1
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
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

