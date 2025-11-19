import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// Placeholder for AI description
serve(async (req) => {
  return new Response(JSON.stringify({ description: "Stunning Charizard from Base Set in Near Mint condition. A must-have for collectors." }), { headers: { 'Content-Type': 'application/json' } });
});

