import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { listing_id } = await req.json();
    
    if (!listing_id) {
      throw new Error("No listing_id provided");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Checking content safety for listing: ${listing_id}`);

    // Fetch listing details
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('*, listing_images(*)')
      .eq('id', listing_id)
      .single();

    if (listingError) throw listingError;
    if (!listing) throw new Error("Listing not found");

    // Use AI to check for banned/illegal content
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
            content: `You are a content safety AI. Detect prohibited items, illegal goods, dangerous items, and policy violations in marketplace listings.

BANNED CATEGORIES:
- Weapons, explosives, ammunition
- Illegal drugs, drug paraphernalia
- Counterfeit goods
- Stolen items
- Adult content, explicit material
- Hazardous materials
- Live animals (endangered species)
- Human body parts, remains
- Recalled products
- Prescription medications`
          },
          {
            role: "user",
            content: `Check this listing for safety violations:
Title: ${listing.title}
Description: ${listing.description}
Category: ${listing.category}
Subcategory: ${listing.subcategory}
Brand: ${listing.brand || 'N/A'}
Condition: ${listing.condition}

Analyze for banned content or policy violations.`
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "safety_check",
            description: "Check content safety and policy compliance",
            parameters: {
              type: "object",
              properties: {
                is_safe: {
                  type: "boolean",
                  description: "Whether the listing passes safety checks"
                },
                violations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      category: { type: "string" },
                      severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
                      explanation: { type: "string" }
                    }
                  },
                  description: "List of detected violations"
                },
                risk_score: {
                  type: "integer",
                  description: "Overall risk score 0-100"
                },
                recommended_action: {
                  type: "string",
                  enum: ["approve", "review", "flag", "remove"],
                  description: "Recommended action"
                },
                reasoning: {
                  type: "string",
                  description: "Detailed explanation"
                }
              },
              required: ["is_safe", "violations", "risk_score", "recommended_action", "reasoning"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "safety_check" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Content safety check failed");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "safety_check") {
      throw new Error("Invalid AI response format");
    }

    const safetyCheck = JSON.parse(toolCall.function.arguments);
    console.log("Safety Check:", safetyCheck);

    // If violations detected, create report and flag
    if (!safetyCheck.is_safe || safetyCheck.violations.length > 0) {
      // Create automated report
      const { error: reportError } = await supabase
        .from('reports')
        .insert({
          reporter_id: listing.seller_id, // System report
          reported_listing_id: listing_id,
          report_type: 'listing',
          reason: `Automated content safety violation: ${safetyCheck.violations.map((v: any) => v.category).join(', ')}`,
          evidence: safetyCheck.violations,
          ai_summary: safetyCheck.reasoning,
          ai_risk_score: safetyCheck.risk_score,
          ai_recommended_action: safetyCheck.recommended_action === 'remove' ? 'ban' : 'warn',
          status: 'pending'
        });

      if (reportError) console.error("Error creating report:", reportError);

      // Add to moderation queue
      const { error: queueError } = await supabase
        .from('moderation_queue')
        .insert({
          item_type: 'listing',
          item_id: listing_id,
          ai_classification: safetyCheck.risk_score > 80 ? 'critical' : safetyCheck.risk_score > 50 ? 'high_priority' : 'medium_priority',
          ai_reason: safetyCheck.reasoning,
          status: 'pending'
        });

      if (queueError) console.error("Error adding to queue:", queueError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        safety_check: safetyCheck 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in moderation-content-safety:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred",
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
