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
            description: "Extract structured details about a fashion item from images",
            parameters: {
              type: "object",
              properties: {
                category: {
                  type: "string",
                  description: "Main category (e.g., Outerwear, Tops, Bottoms, Dresses, Accessories, Shoes)"
                },
                subcategory: {
                  type: "string",
                  description: "Specific subcategory (e.g., Leather Jacket, T-Shirt, Jeans, Sneakers)"
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
                  description: "Primary material (e.g., Cotton, Leather, Denim, Polyester)"
                },
                condition: {
                  type: "string",
                  enum: ["new_with_tags", "like_new", "excellent", "good", "fair"],
                  description: "Estimated condition based on visible wear"
                },
                size_hints: {
                  type: "string",
                  description: "Size if visible (S, M, L, XL, or specific measurements)"
                },
                style_tags: {
                  type: "array",
                  items: { type: "string" },
                  description: "Style descriptors (e.g., vintage, streetwear, minimalist, casual)"
                },
                title: {
                  type: "string",
                  description: "Concise, appealing title for the listing (under 80 characters)"
                },
                description: {
                  type: "string",
                  description: "Detailed, appealing description (2-3 sentences)"
                },
                confidence: {
                  type: "object",
                  description: "Confidence scores (0-100) for each extracted attribute",
                  properties: {
                    category: { type: "number" },
                    brand: { type: "number" },
                    condition: { type: "number" },
                    overall: { type: "number" }
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
