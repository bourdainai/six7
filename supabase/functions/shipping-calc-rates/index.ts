import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  return new Response(JSON.stringify({ 
    rates: [
      { carrier: "Royal Mail", service: "Tracked 24", price: 3.99, days: 1 },
      { carrier: "Evri", service: "Next Day", price: 3.49, days: 1 }
    ] 
  }), { 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
  });
});
