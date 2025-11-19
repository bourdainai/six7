import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  // Mock webhook handler
  return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } });
});

