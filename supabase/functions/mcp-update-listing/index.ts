import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { validateApiKey, checkRateLimit, logApiKeyUsage, corsHeaders } from "../_shared/auth-middleware.ts";

const updateListingSchema = z.object({
  listing_id: z.string().uuid(),
  updates: z.object({
    price: z.number().min(0.01).optional(),
    description: z.string().optional(),
    condition: z.string().optional(),
    trade_enabled: z.boolean().optional(),
    status: z.enum(['active', 'inactive', 'sold']).optional(),
    ai_answer_engines_enabled: z.boolean().optional(),
  }).refine(data => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  }),
});

serve(async (req) => {
  const startTime = Date.now();

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authResult = await validateApiKey(req, ['mcp_listing']);
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
    const rateLimitResult = await checkRateLimit(apiKey.id, '/mcp/update-listing', req.method);
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

    if (jsonrpc !== '2.0' || method !== 'update_listing') {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: id || null,
          error: { code: -32601, message: 'Method not found' },
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { listing_id, updates } = updateListingSchema.parse(params || {});

    // Verify listing ownership
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id, seller_id')
      .eq('id', listing_id)
      .single();

    if (listingError || !listing) {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: id || null,
          error: { code: -32004, message: 'Listing not found' },
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (listing.seller_id !== apiKey.user_id) {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: id || null,
          error: { code: -32003, message: 'Unauthorized - you do not own this listing' },
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare update payload
    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.price !== undefined) updatePayload.seller_price = updates.price;
    if (updates.description !== undefined) updatePayload.description = updates.description;
    if (updates.condition !== undefined) updatePayload.condition = updates.condition;
    if (updates.trade_enabled !== undefined) updatePayload.trade_enabled = updates.trade_enabled;
    if (updates.status !== undefined) updatePayload.status = updates.status;
    if (updates.ai_answer_engines_enabled !== undefined) {
      updatePayload.ai_answer_engines_enabled = updates.ai_answer_engines_enabled;
    }

    // Update listing
    const { data: updatedListing, error: updateError } = await supabase
      .from('listings')
      .update(updatePayload)
      .eq('id', listing_id)
      .select()
      .single();

    if (updateError || !updatedListing) {
      throw new Error(`Failed to update listing: ${updateError?.message}`);
    }

    const responseTime = Date.now() - startTime;
    await logApiKeyUsage(apiKey.id, '/mcp/update-listing', req.method, 200, responseTime);

    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id: id || null,
        result: {
          listing_id: listing_id,
          updated_fields: Object.keys(updates),
          updated_at: updatedListing.updated_at,
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
      const authResult = await validateApiKey(req, ['mcp_listing']);
      if (authResult.success && authResult.apiKey) {
        await logApiKeyUsage(authResult.apiKey.id, '/mcp/update-listing', req.method, 500, responseTime);
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

