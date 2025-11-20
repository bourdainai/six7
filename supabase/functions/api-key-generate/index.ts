import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { corsHeaders } from "../_shared/auth-middleware.ts";

const generateApiKeySchema = z.object({
  label: z.string().max(100).optional(),
  scopes: z.array(z.string()).default(['acp_read', 'mcp_search']),
  rate_limit_per_hour: z.number().int().min(1).max(100000).default(1000),
  rate_limit_per_day: z.number().int().min(1).max(1000000).default(10000),
  expires_at: z.string().datetime().optional(),
});

/**
 * Generates a cryptographically secure API key
 */
function generateSecureApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const length = 48; // 48 characters for strong security
  const randomBytes = crypto.getRandomValues(new Uint8Array(length));
  let key = '';
  for (let i = 0; i < length; i++) {
    key += chars[randomBytes[i] % chars.length];
  }
  // Add prefix for identification
  return `6s_${key}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const {
      label,
      scopes,
      rate_limit_per_hour,
      rate_limit_per_day,
      expires_at,
    } = generateApiKeySchema.parse(body);

    // Generate API key
    const apiKey = generateSecureApiKey();

    // Hash the key before storing using SHA-256
    const encoder = new TextEncoder();
    const data = encoder.encode(apiKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Insert into database
    const { data: insertedKey, error: insertError } = await supabase
      .from('api_keys')
      .insert({
        user_id: user.id,
        key_hash: keyHash,
        label: label || `API Key ${new Date().toISOString()}`,
        scopes,
        rate_limit_per_hour,
        rate_limit_per_day,
        expires_at: expires_at || null,
        is_active: true,
      })
      .select()
      .single();

    if (insertError || !insertedKey) {
      return new Response(
        JSON.stringify({ error: 'Failed to create API key', details: insertError?.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return the key only once (never stored in plain text)
    return new Response(
      JSON.stringify({
        id: insertedKey.id,
        api_key: apiKey, // Only returned once - user must save it
        label: insertedKey.label,
        scopes: insertedKey.scopes,
        rate_limit_per_hour: insertedKey.rate_limit_per_hour,
        rate_limit_per_day: insertedKey.rate_limit_per_day,
        expires_at: insertedKey.expires_at,
        created_at: insertedKey.created_at,
        warning: 'Save this API key now. It will not be shown again.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: 'Invalid request data', details: error.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

