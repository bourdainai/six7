import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*' } });
  return new Response(JSON.stringify({ message: "Trade Counter not implemented yet" }), { headers: { 'Content-Type': 'application/json' } });
});

