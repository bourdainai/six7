import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TransferResult {
  success: boolean;
  sender_balance_after: number | null;
  recipient_balance_after: number | null;
  error_message: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { amount, recipient_id, description } = await req.json();
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    // Use atomic database function to prevent race conditions
    const { data, error: transferError } = await supabase
      .rpc('transfer_funds', {
        p_sender_id: user.id,
        p_recipient_id: recipient_id,
        p_amount: amount,
        p_description: description || 'Transfer to user'
      });

    if (transferError) {
      console.error('Transfer RPC error:', transferError);
      throw new Error(transferError.message);
    }

    // RPC returns array of rows, take the first one
    const result = (Array.isArray(data) ? data[0] : data) as TransferResult | null;

    if (!result?.success) {
      throw new Error(result?.error_message || 'Transfer failed');
    }

    console.log(`✅ Transfer completed: ${amount} from ${user.id} to ${recipient_id}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        sender_balance: result.sender_balance_after,
        recipient_balance: result.recipient_balance_after
      }),
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
