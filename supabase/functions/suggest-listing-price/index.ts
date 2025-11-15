import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { category, subcategory, brand, condition, originalRrp } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Generating price suggestions for:", { category, subcategory, brand, condition, originalRrp });

    // Use Gemini 2.5 Flash for pricing logic
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a fashion resale pricing expert. Analyze items and suggest realistic resale prices based on category, brand, condition, and original retail price. Output ONLY valid JSON.`
          },
          {
            role: "user",
            content: `Suggest pricing for a ${condition} ${brand || 'generic'} ${subcategory || category}${originalRrp ? ` with original price $${originalRrp}` : ''}.`
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "suggest_prices",
            description: "Suggest resale prices for a fashion item",
            parameters: {
              type: "object",
              properties: {
                suggested_price: {
                  type: "number",
                  description: "Fair market price for optimal sell-through"
                },
                quick_sale_price: {
                  type: "number",
                  description: "Lower price for faster sale (3-7 days)"
                },
                ambitious_price: {
                  type: "number",
                  description: "Higher price for patient sellers (3-4 weeks)"
                },
                reasoning: {
                  type: "string",
                  description: "Brief explanation of pricing strategy"
                },
                estimated_days_to_sell: {
                  type: "object",
                  properties: {
                    quick: { type: "string" },
                    fair: { type: "string" },
                    ambitious: { type: "string" }
                  }
                }
              },
              required: ["suggested_price", "quick_sale_price", "ambitious_price", "reasoning"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "suggest_prices" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Pricing suggestion failed");
    }

    const data = await response.json();
    console.log("AI Response:", JSON.stringify(data, null, 2));

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "suggest_prices") {
      throw new Error("Invalid AI response format");
    }

    const pricingData = JSON.parse(toolCall.function.arguments);
    console.log("Pricing suggestions:", pricingData);

    return new Response(
      JSON.stringify({ success: true, data: pricingData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in suggest-listing-price:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred",
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
