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
    const { images } = await req.json();
    
    if (!images || images.length === 0) {
      throw new Error("No images provided");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Analyzing ${images.length} image(s) for listing extraction`);

    // Use Gemini 2.5 Flash for vision analysis
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
            content: `You are an expert fashion analyst. Analyze clothing images and extract structured data. Be specific and accurate. Output ONLY valid JSON.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this fashion item and provide detailed structured information."
              },
              ...images.map((img: string) => ({
                type: "image_url",
                image_url: { url: img }
              }))
            ]
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_item_details",
            description: "Extract comprehensive analysis of item images including quality metrics, damage detection, and structured details",
            parameters: {
              type: "object",
              properties: {
                category: {
                  type: "string",
                  description: "Main category (e.g., Outerwear, Tops, Bottoms, Dresses, Accessories, Shoes, Trading Cards, Electronics, Books, Music)"
                },
                subcategory: {
                  type: "string",
                  description: "Specific subcategory"
                },
                brand: {
                  type: "string",
                  description: "Brand name if visible or identifiable, otherwise null"
                },
                color: {
                  type: "string",
                  description: "Primary color"
                },
                material: {
                  type: "string",
                  description: "Primary material"
                },
                condition: {
                  type: "string",
                  enum: ["new_with_tags", "like_new", "excellent", "good", "fair"],
                  description: "Estimated condition based on visible wear"
                },
                size_hints: {
                  type: "string",
                  description: "Size if visible"
                },
                style_tags: {
                  type: "array",
                  items: { type: "string" },
                  description: "Style descriptors"
                },
                title: {
                  type: "string",
                  description: "Concise, appealing title for the listing (under 80 characters)"
                },
                description: {
                  type: "string",
                  description: "Detailed, appealing description (2-3 sentences)"
                },
                quality_metrics: {
                  type: "object",
                  description: "Image quality scores (0-100 for each)",
                  properties: {
                    lighting_score: {
                      type: "integer",
                      description: "Quality of lighting (0-100). Higher is better. Consider brightness, shadows, and even lighting."
                    },
                    angle_score: {
                      type: "integer",
                      description: "Quality of photo angles (0-100). Are multiple useful angles shown?"
                    },
                    background_score: {
                      type: "integer",
                      description: "Background quality (0-100). Clean, uncluttered backgrounds score higher."
                    },
                    overall_quality: {
                      type: "integer",
                      description: "Overall image quality score (0-100). Consider clarity, focus, resolution."
                    },
                    clarity: {
                      type: "integer",
                      description: "Image clarity/focus 0-100"
                    }
                  }
                },
                damage_detected: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { type: "string", enum: ["stain", "tear", "wear", "discoloration", "missing_button", "pilling", "scratch", "dent"] },
                      severity: { type: "string", enum: ["minor", "moderate", "severe"] },
                      location: { type: "string", description: "Where on the item" },
                      description: { type: "string", description: "Brief description of the damage" },
                      confidence: { type: "number" }
                    }
                  },
                  description: "Array of any visible damage or wear"
                },
                logo_detected: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      brand: { type: "string" },
                      location: { type: "string", description: "Where logo appears" },
                      confidence: { type: "integer", description: "Confidence level 0-100" },
                      authentic_appearance: { type: "boolean" }
                    }
                  },
                  description: "Detected brand logos for verification and authenticity"
                },
                counterfeit_risk_score: {
                  type: "integer",
                  description: "Risk assessment for counterfeit (0-100). 0=authentic, 100=high risk. Based on logo quality, stitching, materials, packaging."
                },
                item_segmented: {
                  type: "boolean",
                  description: "Is the item cleanly isolated from background?"
                },
                is_stock_photo: {
                  type: "boolean",
                  description: "Does this appear to be a stock/professional photo rather than user-taken?"
                },
                photo_suggestions: {
                  type: "array",
                  items: { type: "string" },
                  description: "Specific suggestions for missing angles or better photos (e.g., 'Add close-up of label', 'Show back view', 'Better lighting needed')"
                },
                confidence: {
                  type: "object",
                  description: "Confidence scores (0-100) for each extracted attribute",
                  properties: {
                    category: { type: "number" },
                    brand: { type: "number" },
                    condition: { type: "number" },
                    color: { type: "number" }
                  }
                }
              },
              required: ["category", "color", "condition", "title", "description", "confidence"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "extract_item_details" } }
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
      throw new Error("AI analysis failed");
    }

    const data = await response.json();
    console.log("AI Response:", JSON.stringify(data, null, 2));

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "extract_item_details") {
      throw new Error("Invalid AI response format");
    }

    const extractedData = JSON.parse(toolCall.function.arguments);
    console.log("Extracted data:", extractedData);

    return new Response(
      JSON.stringify({ success: true, data: extractedData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in analyze-listing-images:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred",
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
