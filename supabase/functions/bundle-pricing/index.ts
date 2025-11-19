import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  return new Response(JSON.stringify({ total: 250.00, savings: 20.00 }), { headers: { 'Content-Type': 'application/json' } });
});

