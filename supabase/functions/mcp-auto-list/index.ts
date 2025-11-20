import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { validateApiKey, checkRateLimit, logApiKeyUsage, corsHeaders } from "../_shared/auth-middleware.ts";

const autoListSchema = z.object({
  image_urls: z.array(z.string().url()).min(1).max(12),
  seller_notes: z.string().optional(),
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
    const rateLimitResult = await checkRateLimit(apiKey.id, '/mcp/auto-list', req.method);
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

    if (jsonrpc !== '2.0' || method !== 'auto_list_from_photos') {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: id || null,
          error: { code: -32601, message: 'Method not found' },
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { image_urls, seller_notes } = autoListSchema.parse(params || {});

    // Call AI auto-list function
    const { data: aiData, error: aiError } = await supabase.functions.invoke('ai-auto-list-from-photos', {
      body: {
        imageUrls: image_urls,
        sellerNotes: seller_notes,
      },
      headers: {
        Authorization: req.headers.get('Authorization') || '',
      },
    });

    if (aiError || !aiData) {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: id || null,
          error: { code: -32603, message: 'AI processing failed', data: aiError?.message },
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const confidenceScore = aiData.confidence_score || 0.5;
    const listingDraft = aiData.listing || {};

    // If confidence is high enough and auto-publish is requested, create the listing
    // For now, we'll just return the draft
    const responseTime = Date.now() - startTime;
    await logApiKeyUsage(apiKey.id, '/mcp/auto-list', req.method, 200, responseTime);

    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id: id || null,
        result: {
          listing_draft: {
            title: listingDraft.title || 'AI-Generated Listing',
            description: listingDraft.description || '',
            price: listingDraft.price || 0,
            condition: listingDraft.condition || 'Unknown',
            card_detected: listingDraft.card_detected || null,
          },
          confidence_score: confidenceScore,
          warnings: aiData.warnings || [],
          suggestions: aiData.suggestions || [],
          listing_id: null, // Not auto-published - user must review and publish
          note: 'Review the draft and use create_listing to publish, or enable auto-publish for high-confidence listings.',
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
        await logApiKeyUsage(authResult.apiKey.id, '/mcp/auto-list', req.method, 500, responseTime);
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
