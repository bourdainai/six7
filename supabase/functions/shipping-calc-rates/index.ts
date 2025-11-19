import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  // Mock rate calc
  return new Response(JSON.stringify({ rates: [{ carrier: "Royal Mail", service: "Tracked 24", price: 3.99 }] }), { headers: { 'Content-Type': 'application/json' } });
});

