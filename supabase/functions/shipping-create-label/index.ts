import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  // Mock label generation
  return new Response(JSON.stringify({ labelUrl: "https://example.com/label.pdf", trackingNumber: "GB123456789" }), { headers: { 'Content-Type': 'application/json' } });
});

