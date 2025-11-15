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
    const { report_id } = await req.json();
    
    if (!report_id) {
      throw new Error("No report_id provided");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Auto-classifying report: ${report_id}`);

    // Fetch report details
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('*, reporter:reporter_id(id, full_name, email), reported_user:reported_user_id(id, full_name, trust_score), reported_listing:reported_listing_id(id, title, description)')
      .eq('id', report_id)
      .single();

    if (reportError) throw reportError;
    if (!report) throw new Error("Report not found");

    // Use AI to analyze and classify the report
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
            content: `You are a content moderation AI. Analyze reports and classify their severity, risk, and recommended action.`
          },
          {
            role: "user",
            content: `Analyze this report:
Type: ${report.report_type}
Reason: ${report.reason}
Evidence: ${JSON.stringify(report.evidence)}
Reported User Trust Score: ${report.reported_user?.trust_score || 'N/A'}
Listing: ${report.reported_listing?.title || 'N/A'} - ${report.reported_listing?.description || 'N/A'}

Provide classification as JSON.`
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "classify_report",
            description: "Classify a moderation report",
            parameters: {
              type: "object",
              properties: {
                summary: {
                  type: "string",
                  description: "Brief summary of the report (2-3 sentences)"
                },
                risk_score: {
                  type: "integer",
                  description: "Risk score from 0-100"
                },
                recommended_action: {
                  type: "string",
                  enum: ["dismiss", "warn", "suspend", "ban"],
                  description: "Recommended moderation action"
                },
                classification: {
                  type: "string",
                  enum: ["low_priority", "medium_priority", "high_priority", "critical"],
                  description: "Priority classification"
                },
                reasoning: {
                  type: "string",
                  description: "Explanation for the classification and recommendation"
                }
              },
              required: ["summary", "risk_score", "recommended_action", "classification", "reasoning"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "classify_report" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI classification failed");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "classify_report") {
      throw new Error("Invalid AI response format");
    }

    const classification = JSON.parse(toolCall.function.arguments);
    console.log("AI Classification:", classification);

    // Update report with AI analysis
    const { error: updateError } = await supabase
      .from('reports')
      .update({
        ai_summary: classification.summary,
        ai_risk_score: classification.risk_score,
        ai_recommended_action: classification.recommended_action
      })
      .eq('id', report_id);

    if (updateError) throw updateError;

    // Add to moderation queue
    const { error: queueError } = await supabase
      .from('moderation_queue')
      .insert({
        item_type: 'report',
        item_id: report_id,
        ai_classification: classification.classification,
        ai_reason: classification.reasoning,
        status: 'pending'
      });

    if (queueError) throw queueError;

    return new Response(
      JSON.stringify({ 
        success: true, 
        classification 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in moderation-auto-classifier:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred",
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
