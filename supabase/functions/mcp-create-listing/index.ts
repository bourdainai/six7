import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { validateApiKey, checkRateLimit, logApiKeyUsage, corsHeaders } from "../_shared/auth-middleware.ts";

const createListingSchema = z.object({
  card_data: z.object({
    name: z.string().min(1),
    set: z.string().min(1),
    condition: z.string().min(1),
    rarity: z.string().optional(),
    card_number: z.string().optional(),
  }),
  price: z.number().min(0.01),
  description: z.string().optional(),
  images: z.array(z.string().url()).min(1).max(12).optional(),
  trade_enabled: z.boolean().default(true),
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
    const rateLimitResult = await checkRateLimit(apiKey.id, '/mcp/create-listing', req.method);
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

    if (jsonrpc !== '2.0' || method !== 'create_listing') {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: id || null,
          error: { code: -32601, message: 'Method not found' },
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { card_data, price, description, images, trade_enabled } = createListingSchema.parse(params || {});

    // Create listing - NOTE: ai_answer_engines_enabled defaults to false (opt-in)
    const listingPayload = {
      seller_id: apiKey.user_id,
      title: `${card_data.name} - ${card_data.set} - ${card_data.condition}`,
      description: description || `Listing for ${card_data.name} from ${card_data.set}`,
      category: "Pokémon Singles",
      set_code: card_data.set,
      card_number: card_data.card_number || null,
      rarity: card_data.rarity || null,
      condition: card_data.condition,
      seller_price: price,
      status: 'active',
      trade_enabled: trade_enabled,
      ai_answer_engines_enabled: false, // Default to false - user must opt-in via UI
      published_at: new Date().toISOString(),
      shipping_cost_uk: 2.99,
      free_shipping: false,
      estimated_delivery_days: 3,
    };

    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .insert(listingPayload)
      .select()
      .single();

    if (listingError || !listing) {
      throw new Error(`Failed to create listing: ${listingError?.message}`);
    }

    // Upload images if provided
    if (images && images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        const imageUrl = images[i];
        
        // Download image
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) continue;
        
        const imageBlob = await imageResponse.blob();
        const fileName = `${listing.id}/${Date.now()}-${i}.jpg`;
        
        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('listing-images')
          .upload(fileName, imageBlob);

        if (uploadError) continue;

        const { data: { publicUrl } } = supabase.storage
          .from('listing-images')
          .getPublicUrl(fileName);

        await supabase.from('listing_images').insert({
          listing_id: listing.id,
          image_url: publicUrl,
          display_order: i,
        });
      }
    }

    // Generate embedding for search
    try {
      await supabase.functions.invoke('generate-listing-embedding', {
        body: { listing_id: listing.id },
      });
    } catch (e) {
      console.error('Failed to generate embedding:', e);
    }

    const responseTime = Date.now() - startTime;
    await logApiKeyUsage(apiKey.id, '/mcp/create-listing', req.method, 200, responseTime);

    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id: id || null,
        result: {
          listing_id: listing.id,
          listing_url: `${Deno.env.get('SITE_URL') || 'https://6seven.com'}/listing/${listing.id}`,
          status: 'created',
          ai_answer_engines_enabled: false,
          note: 'Listing created. Enable AI Answer Engines via the UI to make it available to AI agents.',
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
        await logApiKeyUsage(authResult.apiKey.id, '/mcp/create-listing', req.method, 500, responseTime);
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
