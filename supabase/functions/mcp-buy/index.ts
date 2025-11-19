import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  return new Response(JSON.stringify({ orderId: "ord_123" }), { headers: { 'Content-Type': 'application/json' } });
});

