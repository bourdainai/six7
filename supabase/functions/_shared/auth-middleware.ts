import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export interface AuthenticatedApiKey {
  id: string;
  user_id: string;
  scopes: string[];
  rate_limit_per_hour: number;
  rate_limit_per_day: number;
  is_active: boolean;
  expires_at: string | null;
}

export interface AuthResult {
  success: boolean;
  apiKey?: AuthenticatedApiKey;
  error?: string;
  statusCode?: number;
}

/**
 * Validates an API key from the Authorization header
 * Returns the API key record if valid, or an error response
 */
export async function validateApiKey(
  req: Request,
  requiredScopes?: string[]
): Promise<AuthResult> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Extract API key from Authorization header
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      success: false,
      error: 'Missing or invalid Authorization header. Expected: Bearer <api_key>',
      statusCode: 401,
    };
  }

  const apiKey = authHeader.replace('Bearer ', '').trim();
  if (!apiKey) {
    return {
      success: false,
      error: 'API key is required',
      statusCode: 401,
    };
  }

  // Fetch all API keys for the user (we need to check against hashes)
  // Note: In production, we'd want to optimize this with a lookup table
  // For now, we'll fetch active keys and check hashes
  const { data: apiKeys, error: fetchError } = await supabase
    .from('api_keys')
    .select('*')
    .eq('is_active', true);

  if (fetchError || !apiKeys) {
    return {
      success: false,
      error: 'Failed to validate API key',
      statusCode: 500,
    };
  }

  // Hash the provided API key for comparison
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const providedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  // Find matching key by comparing hashes
  const matchedKey = apiKeys.find(key => key.key_hash === providedHash);

  if (!matchedKey) {
    return {
      success: false,
      error: 'Invalid API key',
      statusCode: 401,
    };
  }

  // Check if key is expired
  if (matchedKey.expires_at) {
    const expiresAt = new Date(matchedKey.expires_at);
    if (expiresAt < new Date()) {
      return {
        success: false,
        error: 'API key has expired',
        statusCode: 401,
      };
    }
  }

  // Check required scopes
  if (requiredScopes && requiredScopes.length > 0) {
    const keyScopes = matchedKey.scopes || [];
    const hasAllScopes = requiredScopes.every(scope => keyScopes.includes(scope));
    if (!hasAllScopes) {
      return {
        success: false,
        error: `Insufficient permissions. Required scopes: ${requiredScopes.join(', ')}`,
        statusCode: 403,
      };
    }
  }

  // Update last_used_at
  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', matchedKey.id);

  return {
    success: true,
    apiKey: {
      id: matchedKey.id,
      user_id: matchedKey.user_id,
      scopes: matchedKey.scopes || [],
      rate_limit_per_hour: matchedKey.rate_limit_per_hour || 1000,
      rate_limit_per_day: matchedKey.rate_limit_per_day || 10000,
      is_active: matchedKey.is_active,
      expires_at: matchedKey.expires_at,
    },
  };
}

/**
 * Checks rate limits for an API key
 * Returns true if within limits, false if exceeded
 */
export async function checkRateLimit(
  apiKeyId: string,
  endpoint: string,
  method: string
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get API key details
  const { data: apiKey, error } = await supabase
    .from('api_keys')
    .select('rate_limit_per_hour, rate_limit_per_day')
    .eq('id', apiKeyId)
    .single();

  if (error || !apiKey) {
    return { allowed: false };
  }

  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Check hourly limit
  const { count: hourlyCount } = await supabase
    .from('api_key_usage_logs')
    .select('*', { count: 'exact', head: true })
    .eq('api_key_id', apiKeyId)
    .gte('created_at', oneHourAgo.toISOString());

  if (hourlyCount && hourlyCount >= apiKey.rate_limit_per_hour) {
    return {
      allowed: false,
      retryAfter: 3600, // 1 hour in seconds
    };
  }

  // Check daily limit
  const { count: dailyCount } = await supabase
    .from('api_key_usage_logs')
    .select('*', { count: 'exact', head: true })
    .eq('api_key_id', apiKeyId)
    .gte('created_at', oneDayAgo.toISOString());

  if (dailyCount && dailyCount >= apiKey.rate_limit_per_day) {
    return {
      allowed: false,
      retryAfter: 86400, // 24 hours in seconds
    };
  }

  return { allowed: true };
}

/**
 * Logs API key usage
 */
export async function logApiKeyUsage(
  apiKeyId: string,
  endpoint: string,
  method: string,
  statusCode: number,
  responseTimeMs: number
): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  await supabase.from('api_key_usage_logs').insert({
    api_key_id: apiKeyId,
    endpoint,
    method,
    status_code: statusCode,
    response_time_ms: responseTimeMs,
  });
}

export { corsHeaders };

