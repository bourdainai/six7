import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// Placeholder
serve(async (req) => {
  return new Response(JSON.stringify({ status: "confirmed", orderId: "ord_123" }), { headers: { 'Content-Type': 'application/json' } });
});

