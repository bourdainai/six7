import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

serve(async (req) => {
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { listingId, quantity } = await req.json();
  
  // Create session
  const { data, error } = await supabase.from('acp_sessions').insert({ 
    status: 'active',
    cart_items: [{ listingId, quantity }]
  }).select().single();

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });

  return new Response(JSON.stringify({ sessionId: data.id }), { headers: { 'Content-Type': 'application/json' } });
});

