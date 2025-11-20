import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { validateApiKey, checkRateLimit, logApiKeyUsage, corsHeaders } from "../_shared/auth-middleware.ts";

const tradeOfferSchema = z.object({
  target_listing_id: z.string().uuid(),
  trade_items: z.array(z.object({
    listing_id: z.string().uuid(),
    valuation: z.number().optional(),
  })).optional(),
  cash_amount: z.number().min(0).default(0),
  photos: z.array(z.string().url()).max(10).optional(),
});

serve(async (req) => {
  const startTime = Date.now();
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authResult = await validateApiKey(req, ['mcp_search']);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: null,
          error: { code: -32000, message: authResult.error },
        }),
        { status: authResult.statusCode || 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = authResult.apiKey!;
    const rateLimitResult = await checkRateLimit(apiKey.id, '/mcp/trade-offer', req.method);
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: null,
          error: { code: -32001, message: 'Rate limit exceeded' },
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { jsonrpc, id, method, params } = body;

    if (jsonrpc !== '2.0' || method !== 'submit_trade_offer') {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: id || null,
          error: { code: -32601, message: 'Method not found' },
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { target_listing_id, trade_items, cash_amount, photos } = tradeOfferSchema.parse(params || {});

    // Verify target listing exists and is AI-enabled
    const { data: targetListing, error: listingError } = await supabase
      .from('listings')
      .select('id, seller_id, status, ai_answer_engines_enabled')
      .eq('id', target_listing_id)
      .single();

    if (listingError || !targetListing) {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: id || null,
          error: { code: -32004, message: 'Target listing not found' },
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!targetListing.ai_answer_engines_enabled) {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: id || null,
          error: { code: -32006, message: 'This listing is not available for trade offers via AI agents' },
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (targetListing.status !== 'active') {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: id || null,
          error: { code: -32005, message: 'Target listing is not active' },
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (targetListing.seller_id === apiKey.user_id) {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: id || null,
          error: { code: -32007, message: 'Cannot trade with yourself' },
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get valuations for trade items
    let tradeItemValuations: any[] = [];
    if (trade_items && trade_items.length > 0) {
      const { data: valuationData } = await supabase.functions.invoke('trade-valuation', {
        body: {
          tradeItems: trade_items,
        },
        headers: {
          Authorization: req.headers.get('Authorization') || '',
        },
      });
      tradeItemValuations = valuationData?.valuations || trade_items.map((item: any) => ({
        ...item,
        valuation: item.valuation || 0,
      }));
    }

    // Get fairness score
    let fairnessScore = 0.85;
    let fairnessAssessment = 'Fair trade';
    try {
      const { data: fairnessData } = await supabase.functions.invoke('trade-fairness', {
        body: {
          targetListingId: target_listing_id,
          tradeItems: trade_items || [],
          cashAmount: cash_amount,
        },
        headers: {
          Authorization: req.headers.get('Authorization') || '',
        },
      });
      fairnessScore = fairnessData?.fairness_score || 0.85;
      fairnessAssessment = fairnessData?.assessment || 'Fair trade';
    } catch (e) {
      console.error('Fairness calculation failed:', e);
    }

    // Create trade offer using existing trade-create function
    const { data: tradeOffer, error: offerError } = await supabase
      .from('trade_offers')
      .insert({
        buyer_id: apiKey.user_id,
        seller_id: targetListing.seller_id,
        target_listing_id: target_listing_id,
        cash_amount: cash_amount,
        trade_items: trade_items || [],
        trade_item_valuations: tradeItemValuations,
        photos: photos || [],
        ai_fairness_score: fairnessScore,
        status: 'pending',
        expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (offerError || !tradeOffer) {
      throw new Error(`Failed to create trade offer: ${offerError?.message}`);
    }

    // Calculate total offer value
    const tradeItemsValue = tradeItemValuations.reduce((sum, item) => sum + (item.valuation || 0), 0);
    const totalOfferValue = tradeItemsValue + cash_amount;

    const responseTime = Date.now() - startTime;
    await logApiKeyUsage(apiKey.id, '/mcp/trade-offer', req.method, 200, responseTime);

    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id: id || null,
        result: {
          trade_offer_id: tradeOffer.id,
          status: 'pending',
          total_offer_value: totalOfferValue,
          breakdown: {
            trade_items_value: tradeItemsValue,
            cash: cash_amount,
          },
          ai_fairness_score: fairnessScore,
          ai_assessment: fairnessAssessment,
          expires_at: tradeOffer.expiry_date,
          execution_time_ms: responseTime,
        },
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: null,
          error: { code: -32602, message: 'Invalid params', data: error.errors },
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    try {
      const authResult = await validateApiKey(req, ['mcp_search']);
      if (authResult.success && authResult.apiKey) {
        await logApiKeyUsage(authResult.apiKey.id, '/mcp/trade-offer', req.method, 500, responseTime);
      }
    } catch {}

    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32603, message: 'Internal error', data: error instanceof Error ? error.message : 'Unknown error' },
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
