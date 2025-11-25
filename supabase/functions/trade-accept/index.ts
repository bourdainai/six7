import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const acceptSchema = z.object({
  offerId: z.string().uuid('Invalid offer ID format'),
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
    const { offerId } = acceptSchema.parse(body);
    
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
    
    // Verify user is the recipient (seller of target item)
    if (offer.seller_id !== user.id) {
      throw new Error('Not authorized to accept this offer');
    }

    // Use transaction for atomic operations
    const { error: txError } = await supabase.rpc('accept_trade_offer', {
      p_offer_id: offerId,
      p_cash_amount: offer.cash_amount || 0
    });

    if (txError) {
      console.error('Transaction error:', txError);
      throw new Error('Failed to accept trade offer. Please try again.');
    }

    return new Response(
      JSON.stringify({ success: true }),
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

