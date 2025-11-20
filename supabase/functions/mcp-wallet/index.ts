import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { validateApiKey, checkRateLimit, logApiKeyUsage, corsHeaders } from "../_shared/auth-middleware.ts";

const walletSchema = z.object({
  operation: z.enum(['get_balance', 'deposit', 'withdraw']),
  amount: z.number().min(0.01).optional(),
  currency: z.string().default('GBP').optional(),
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
    const rateLimitResult = await checkRateLimit(apiKey.id, '/mcp/wallet', req.method);
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

    // Handle different wallet methods
    const methodMap: Record<string, string> = {
      'get_wallet_balance': 'get_balance',
      'deposit': 'deposit',
      'withdraw': 'withdraw',
    };

    const operation = methodMap[method || ''] || (params?.operation || 'get_balance');

    if (jsonrpc !== '2.0' || !['get_wallet_balance', 'deposit', 'withdraw', 'wallet'].includes(method || '')) {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: id || null,
          error: { code: -32601, message: 'Method not found' },
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const parsedParams = walletSchema.parse(params || {});

    // Get or create wallet
    let { data: wallet, error: walletError } = await supabase
      .from('wallet_accounts')
      .select('*')
      .eq('user_id', apiKey.user_id)
      .single();

    if (walletError && walletError.code === 'PGRST116') {
      // Wallet doesn't exist, create it
      const { data: newWallet, error: createError } = await supabase
        .from('wallet_accounts')
        .insert({ user_id: apiKey.user_id, balance: 0 })
        .select()
        .single();
      
      if (createError) throw createError;
      wallet = newWallet;
    } else if (walletError) {
      throw walletError;
    }

    // Handle operations
    if (operation === 'get_balance') {
      const responseTime = Date.now() - startTime;
      await logApiKeyUsage(apiKey.id, '/mcp/wallet', req.method, 200, responseTime);

      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: id || null,
          result: {
            balance: parseFloat(wallet?.balance || 0),
            pending_balance: parseFloat(wallet?.pending_balance || 0),
            currency: 'GBP',
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
    }

    if (operation === 'deposit' && parsedParams.amount) {
      const { data: depositData, error: depositError } = await supabase.functions.invoke('wallet-deposit', {
        body: {
          amount: parsedParams.amount,
          currency: parsedParams.currency || 'GBP',
        },
        headers: {
          Authorization: req.headers.get('Authorization') || '',
        },
      });

      if (depositError) throw depositError;

      const responseTime = Date.now() - startTime;
      await logApiKeyUsage(apiKey.id, '/mcp/wallet', req.method, 200, responseTime);

      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: id || null,
          result: {
            operation: 'deposit',
            amount: parsedParams.amount,
            new_balance: depositData?.balance || wallet?.balance,
            currency: 'GBP',
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
    }

    if (operation === 'withdraw' && parsedParams.amount) {
      const { data: withdrawData, error: withdrawError } = await supabase.functions.invoke('wallet-withdraw', {
        body: {
          amount: parsedParams.amount,
        },
        headers: {
          Authorization: req.headers.get('Authorization') || '',
        },
      });

      if (withdrawError) throw withdrawError;

      const responseTime = Date.now() - startTime;
      await logApiKeyUsage(apiKey.id, '/mcp/wallet', req.method, 200, responseTime);

      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: id || null,
          result: {
            operation: 'withdraw',
            amount: parsedParams.amount,
            new_balance: withdrawData?.balance || wallet?.balance,
            currency: 'GBP',
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
    }

    throw new Error('Invalid operation or missing amount');
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
        await logApiKeyUsage(authResult.apiKey.id, '/mcp/wallet', req.method, 500, responseTime);
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
