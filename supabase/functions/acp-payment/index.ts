import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// Placeholder
serve(async (req) => {
  return new Response(JSON.stringify({ status: "captured" }), { headers: { 'Content-Type': 'application/json' } });
});

