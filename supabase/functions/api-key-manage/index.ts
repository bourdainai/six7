import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { corsHeaders } from "../_shared/auth-middleware.ts";

const updateApiKeySchema = z.object({
  label: z.string().max(100).optional(),
  scopes: z.array(z.string()).optional(),
  rate_limit_per_hour: z.number().int().min(1).max(100000).optional(),
  rate_limit_per_day: z.number().int().min(1).max(1000000).optional(),
  expires_at: z.string().datetime().nullable().optional(),
  is_active: z.boolean().optional(),
});

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

    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const keyId = url.searchParams.get('id');

    // List user's API keys
    if (req.method === 'GET' && !action) {
      const { data: keys, error } = await supabase
        .from('api_keys')
        .select('id, label, scopes, rate_limit_per_hour, rate_limit_per_day, expires_at, is_active, last_used_at, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch API keys', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get usage statistics for each key
      const keysWithStats = await Promise.all(
        (keys || []).map(async (key) => {
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          const { count: dailyUsage } = await supabase
            .from('api_key_usage_logs')
            .select('*', { count: 'exact', head: true })
            .eq('api_key_id', key.id)
            .gte('created_at', oneDayAgo.toISOString());

          return {
            ...key,
            daily_usage: dailyUsage || 0,
          };
        })
      );

      return new Response(
        JSON.stringify({ keys: keysWithStats }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get usage statistics for a specific key
    if (req.method === 'GET' && action === 'stats' && keyId) {
      // Verify ownership
      const { data: key, error: keyError } = await supabase
        .from('api_keys')
        .select('id')
        .eq('id', keyId)
        .eq('user_id', user.id)
        .single();

      if (keyError || !key) {
        return new Response(
          JSON.stringify({ error: 'API key not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      const [dailyUsage, hourlyUsage, endpointStats] = await Promise.all([
        supabase
          .from('api_key_usage_logs')
          .select('*', { count: 'exact', head: true })
          .eq('api_key_id', keyId)
          .gte('created_at', oneDayAgo.toISOString()),
        supabase
          .from('api_key_usage_logs')
          .select('*', { count: 'exact', head: true })
          .eq('api_key_id', keyId)
          .gte('created_at', oneHourAgo.toISOString()),
        supabase
          .from('api_key_usage_logs')
          .select('endpoint, status_code')
          .eq('api_key_id', keyId)
          .gte('created_at', oneDayAgo.toISOString())
          .limit(1000),
      ]);

      // Aggregate endpoint statistics
      const endpointCounts: Record<string, { total: number; errors: number }> = {};
      (endpointStats.data || []).forEach((log) => {
        if (!endpointCounts[log.endpoint]) {
          endpointCounts[log.endpoint] = { total: 0, errors: 0 };
        }
        endpointCounts[log.endpoint].total++;
        if (log.status_code >= 400) {
          endpointCounts[log.endpoint].errors++;
        }
      });

      return new Response(
        JSON.stringify({
          daily_usage: dailyUsage.count || 0,
          hourly_usage: hourlyUsage.count || 0,
          endpoint_stats: endpointCounts,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update API key
    if (req.method === 'PUT' && keyId) {
      // Verify ownership
      const { data: key, error: keyError } = await supabase
        .from('api_keys')
        .select('id')
        .eq('id', keyId)
        .eq('user_id', user.id)
        .single();

      if (keyError || !key) {
        return new Response(
          JSON.stringify({ error: 'API key not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await req.json().catch(() => ({}));
      const updates = updateApiKeySchema.parse(body);

      const { data: updatedKey, error: updateError } = await supabase
        .from('api_keys')
        .update(updates)
        .eq('id', keyId)
        .select()
        .single();

      if (updateError || !updatedKey) {
        return new Response(
          JSON.stringify({ error: 'Failed to update API key', details: updateError?.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(updatedKey),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Revoke/Delete API key
    if (req.method === 'DELETE' && keyId) {
      // Verify ownership
      const { data: key, error: keyError } = await supabase
        .from('api_keys')
        .select('id')
        .eq('id', keyId)
        .eq('user_id', user.id)
        .single();

      if (keyError || !key) {
        return new Response(
          JSON.stringify({ error: 'API key not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error: deleteError } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', keyId);

      if (deleteError) {
        return new Response(
          JSON.stringify({ error: 'Failed to delete API key', details: deleteError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: 'API key deleted' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid request' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: 'Invalid request data', details: error.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

