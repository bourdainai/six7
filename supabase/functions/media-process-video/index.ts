import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  // Placeholder for transcoding job
  return new Response(JSON.stringify({ jobId: "job_123" }), { headers: { 'Content-Type': 'application/json' } });
});

