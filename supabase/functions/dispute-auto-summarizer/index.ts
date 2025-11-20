import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const disputeSummarizerSchema = z.object({
  dispute_id: z.string().uuid({ message: 'Invalid dispute ID format' }),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { dispute_id } = disputeSummarizerSchema.parse(body);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Auto-summarizing dispute: ${dispute_id}`);

    // Fetch dispute details
    const { data: dispute, error: disputeError } = await supabase
      .from('disputes')
      .select(`
        *,
        buyer:buyer_id(id, full_name, email, trust_score),
        seller:seller_id(id, full_name, email, trust_score),
        listing:listing_id(id, title, description, seller_price),
        order:order_id(id, total_amount, status)
      `)
      .eq('id', dispute_id)
      .single();

    if (disputeError) throw disputeError;
    if (!dispute) throw new Error("Dispute not found");

    // Use AI to analyze and summarize the dispute
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
            content: `You are a dispute resolution AI. Analyze disputes objectively and recommend fair outcomes based on evidence, policies, and trust scores.`
          },
          {
            role: "user",
            content: `Analyze this dispute and recommend resolution:

Dispute Type: ${dispute.dispute_type}
Buyer Reason: ${dispute.reason}
Seller Response: ${dispute.seller_response || 'No response yet'}

Buyer Trust Score: ${dispute.buyer?.trust_score || 50}
Seller Trust Score: ${dispute.seller?.trust_score || 50}

Buyer Evidence: ${JSON.stringify(dispute.buyer_evidence)}
Seller Evidence: ${JSON.stringify(dispute.seller_evidence)}

Order Amount: $${dispute.order?.total_amount || 0}
Listing: ${dispute.listing?.title} - $${dispute.listing?.seller_price}

Provide objective analysis and recommendation.`
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "analyze_dispute",
            description: "Analyze dispute and recommend resolution",
            parameters: {
              type: "object",
              properties: {
                summary: {
                  type: "string",
                  description: "Objective summary of the dispute (3-4 sentences)"
                },
                key_facts: {
                  type: "array",
                  items: { type: "string" },
                  description: "Key facts from evidence"
                },
                recommended_outcome: {
                  type: "string",
                  enum: ["buyer_favor", "seller_favor", "partial_refund", "full_refund"],
                  description: "Recommended resolution"
                },
                confidence_score: {
                  type: "integer",
                  description: "Confidence in recommendation 0-100"
                },
                reasoning: {
                  type: "string",
                  description: "Detailed reasoning for the recommendation"
                },
                suggested_refund_amount: {
                  type: "number",
                  description: "Suggested refund amount if applicable"
                }
              },
              required: ["summary", "key_facts", "recommended_outcome", "confidence_score", "reasoning"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "analyze_dispute" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Dispute analysis failed");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "analyze_dispute") {
      throw new Error("Invalid AI response format");
    }

    const analysis = JSON.parse(toolCall.function.arguments);
    console.log("Dispute Analysis:", analysis);

    // Update dispute with AI analysis
    const { error: updateError } = await supabase
      .from('disputes')
      .update({
        ai_summary: analysis.summary,
        ai_recommended_outcome: analysis.recommended_outcome,
        ai_confidence_score: analysis.confidence_score
      })
      .eq('id', dispute_id);

    if (updateError) throw updateError;

    // Add to moderation queue if not already there
    const { error: queueError } = await supabase
      .from('moderation_queue')
      .insert({
        item_type: 'dispute',
        item_id: dispute_id,
        ai_classification: analysis.confidence_score > 80 ? 'low_priority' : analysis.confidence_score > 50 ? 'medium_priority' : 'high_priority',
        ai_reason: analysis.reasoning,
        status: 'pending'
      });

    // Ignore error if already exists
    if (queueError && !queueError.message.includes('duplicate')) {
      console.error("Error adding to queue:", queueError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        analysis 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in dispute-auto-summarizer:", error);
    
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: 'Invalid request data', details: error.errors, success: false }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred",
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
