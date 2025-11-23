import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const counterSchema = z.object({
  originalOfferId: z.string().uuid(),
  cashAmount: z.number().min(0).optional(),
  tradeItems: z.array(z.object({
    listingId: z.string().uuid(),
    title: z.string().optional(),
    value: z.number().positive().optional()
  })).optional(),
  notes: z.string().max(500).optional(),
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
      originalOfferId, 
      cashAmount, 
      tradeItems, 
      notes, 
      aiFairnessScore, 
      aiSuggestions 
    } = counterSchema.parse(body);
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) throw new Error('Invalid user token');

    // Get original offer
    const { data: originalOffer, error: offerError } = await supabase
      .from('trade_offers')
      .select('*, target_listing:listings(*)')
      .eq('id', originalOfferId)
      .single();

    if (offerError || !originalOffer) throw new Error('Original offer not found');
    if (originalOffer.status !== 'pending') throw new Error('Can only counter pending offers');

    // Determine who is countering
    const isCounterBySeller = user.id === originalOffer.seller_id;
    const isCounterByBuyer = user.id === originalOffer.buyer_id;
    
    if (!isCounterBySeller && !isCounterByBuyer) {
      throw new Error('You are not part of this trade');
    }

    // Update original offer status to 'countered'
    await supabase
      .from('trade_offers')
      .update({ status: 'countered' })
      .eq('id', originalOfferId);

    // Get valuations for items
    const valuations = tradeItems?.map((item: any) => ({ 
      ...item, 
      valuation: item.value || 0 
    })) || [];

    const fairnessScore = aiFairnessScore || 0.5;
    const nextRound = (originalOffer.negotiation_round || 1) + 1;

    // Create counter-offer
    const { data: counterOffer, error: counterError } = await supabase
      .from('trade_offers')
      .insert({
        buyer_id: isCounterByBuyer ? user.id : originalOffer.buyer_id,
        seller_id: isCounterBySeller ? user.id : originalOffer.seller_id,
        target_listing_id: originalOffer.target_listing_id,
        cash_amount: cashAmount || 0,
        trade_items: tradeItems || [],
        trade_item_valuations: valuations,
        ai_fairness_score: fairnessScore,
        status: 'pending',
        expiry_date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 hours
        trade_type: originalOffer.trade_type || 'simple',
        requester_notes: notes,
        ai_suggestions: aiSuggestions || [],
        negotiation_round: nextRound,
        parent_offer_id: originalOfferId
      })
      .select()
      .single();

    if (counterError) throw counterError;

    // Log negotiation
    await supabase
      .from('trade_negotiations')
      .insert({
        original_offer_id: originalOfferId,
        iteration: nextRound,
        proposer_id: user.id
      });

    // Send notification to the other party
    const recipientId = isCounterBySeller ? originalOffer.buyer_id : originalOffer.seller_id;
    await supabase
      .from('notifications')
      .insert({
        user_id: recipientId,
        type: 'trade_counter',
        title: 'Counter Offer Received',
        message: `You received a counter offer on your trade (Round ${nextRound})`,
        link: `/trade-offers`,
        metadata: { 
          trade_offer_id: counterOffer.id,
          original_offer_id: originalOfferId,
          round: nextRound
        }
      });

    return new Response(
      JSON.stringify({ success: true, counterId: counterOffer.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Counter offer error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
