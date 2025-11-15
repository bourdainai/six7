import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { listingId } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get listing data
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('*')
      .eq('id', listingId)
      .single();

    if (listingError) throw listingError;
    if (!listing) throw new Error("Listing not found");

    const daysSinceListed = Math.floor(
      (Date.now() - new Date(listing.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Generating copilot suggestions for listing ${listingId}`);

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
            content: `You are an expert fashion resale advisor. Analyze listings and provide actionable optimization suggestions. Be specific and practical. Output ONLY valid JSON.`
          },
          {
            role: "user",
            content: `Analyze this listing and suggest improvements:
Title: ${listing.title}
Description: ${listing.description || 'No description'}
Category: ${listing.category} / ${listing.subcategory}
Brand: ${listing.brand || 'Unknown'}
Price: $${listing.seller_price}
Condition: ${listing.condition}
Days listed: ${daysSinceListed}
Views: ${listing.views || 0}
Saves: ${listing.saves || 0}
Status: ${listing.status}`
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_optimization_suggestions",
            description: "Generate actionable suggestions to improve a listing's performance",
            parameters: {
              type: "object",
              properties: {
                suggestions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: {
                        type: "string",
                        enum: ["price", "title", "description", "photos", "timing", "promotion"],
                        description: "Type of suggestion"
                      },
                      priority: {
                        type: "string",
                        enum: ["high", "medium", "low"],
                        description: "Priority level"
                      },
                      title: {
                        type: "string",
                        description: "Brief suggestion title"
                      },
                      suggestion: {
                        type: "string",
                        description: "Detailed actionable suggestion"
                      },
                      impact: {
                        type: "string",
                        description: "Expected impact on sales"
                      },
                      action: {
                        type: "string",
                        description: "Specific action to take"
                      }
                    },
                    required: ["type", "priority", "title", "suggestion", "impact", "action"]
                  }
                },
                overall_health: {
                  type: "string",
                  enum: ["excellent", "good", "needs_attention", "critical"],
                  description: "Overall listing health"
                },
                health_score: {
                  type: "number",
                  description: "Health score from 0-100"
                },
                reasoning: {
                  type: "string",
                  description: "Brief explanation of the health assessment"
                }
              },
              required: ["suggestions", "overall_health", "health_score", "reasoning"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "generate_optimization_suggestions" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Optimization suggestions failed");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("No suggestions generated");
    }

    const suggestions = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: suggestions 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
