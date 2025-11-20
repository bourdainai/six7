import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { validateApiKey, checkRateLimit, logApiKeyUsage, corsHeaders } from "../_shared/auth-middleware.ts";

const evaluatePriceSchema = z.object({
  card_data: z.object({
    name: z.string().min(1),
    set: z.string().min(1),
    condition: z.string().min(1),
    card_number: z.string().optional(),
  }),
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
    const rateLimitResult = await checkRateLimit(apiKey.id, '/mcp/evaluate-price', req.method);
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

    if (jsonrpc !== '2.0' || method !== 'evaluate_price') {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: id || null,
          error: { code: -32601, message: 'Method not found' },
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { card_data } = evaluatePriceSchema.parse(params || {});

    // Call AI price suggestion function
    let aiSuggestion = null;
    try {
      const { data: suggestionData } = await supabase.functions.invoke('ai-price-suggestion', {
        body: {
          card_name: card_data.name,
          set: card_data.set,
          condition: card_data.condition,
        },
      });
      aiSuggestion = suggestionData;
    } catch (e) {
      console.error('AI price suggestion failed:', e);
    }

    // Get comparable sales from database
    const { data: comps } = await supabase
      .from('pricing_comps')
      .select('price, condition, date_sold, source')
      .eq('card_id', card_data.name) // Simplified - would need proper card_id lookup
      .eq('condition', card_data.condition)
      .order('date_sold', { ascending: false })
      .limit(50);

    // Calculate market analysis
    const prices = (comps || []).map((c: any) => parseFloat(c.price || 0)).filter(p => p > 0);
    const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
    const sortedPrices = [...prices].sort((a, b) => a - b);
    const medianPrice = sortedPrices.length > 0
      ? sortedPrices[Math.floor(sortedPrices.length / 2)]
      : 0;
    const lowPrice = sortedPrices[0] || 0;
    const highPrice = sortedPrices[sortedPrices.length - 1] || 0;

    // Use AI suggestion if available, otherwise use market average
    const suggestedPrice = aiSuggestion?.suggestedPrice || avgPrice || medianPrice;
    const confidence = aiSuggestion ? 0.85 : (prices.length > 10 ? 0.75 : 0.5);

    const responseTime = Date.now() - startTime;
    await logApiKeyUsage(apiKey.id, '/mcp/evaluate-price', req.method, 200, responseTime);

    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id: id || null,
        result: {
          suggested_price: suggestedPrice,
          currency: 'GBP',
          market_analysis: {
            average_price: avgPrice,
            median_price: medianPrice,
            low_price: lowPrice,
            high_price: highPrice,
            sample_size: prices.length,
          },
          recent_sales: (comps || []).slice(0, 10).map((c: any) => ({
            sold_date: c.date_sold,
            sold_price: parseFloat(c.price || 0),
            condition: c.condition,
            marketplace: c.source || 'internal',
          })),
          trend: prices.length > 0 ? '+0%' : null, // Would calculate from historical data
          confidence: confidence,
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
        await logApiKeyUsage(authResult.apiKey.id, '/mcp/evaluate-price', req.method, 500, responseTime);
      }
    } catch (e) {
      console.error('Error logging API usage:', e);
    }

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
