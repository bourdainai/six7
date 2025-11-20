import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrls } = await req.json();

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      throw new Error('No images provided');
    }

    const openAiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log(`Processing ${imageUrls.length} images...`);

    // Construct the message for GPT-4o
    const content = [
      {
        type: "text",
        text: "You are an expert Pokémon TCG grader and identifier. Analyze these card images and extract the following details in JSON format:\n\n" +
              "- title: The full card name (e.g., 'Charizard Base Set Unlimited Holo')\n" +
              "- set_code: The set code or abbreviation (e.g., 'BS 4/102')\n" +
              "- card_number: The card number (e.g., '4/102')\n" +
              "- rarity: The rarity (Common, Uncommon, Rare, Rare Holo, Ultra Rare, Secret Rare, etc.)\n" +
              "- condition: Estimate the condition (new_with_tags, like_new, excellent, good, fair, poor). Be strict.\n" +
              "- description: A brief, professional description of the card, noting any visible flaws.\n" +
              "- category: Always 'Pokémon Singles'\n" +
              "- subcategory: Suggest a subcategory (Standard Format, Vintage (WOTC), Modern Chase, etc.)\n\n" +
              "Return ONLY the JSON object."
      },
      ...imageUrls.map((url: string) => ({
        type: "image_url",
        image_url: {
          url: url,
        },
      })),
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: content,
          },
        ],
        max_tokens: 1000,
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error('OpenAI API Error:', data.error);
      throw new Error(`OpenAI API Error: ${data.error.message}`);
    }

    const aiContent = data.choices[0].message.content;
    
    // Clean up markdown code blocks if present
    const jsonString = aiContent.replace(/```json\n|\n```/g, '');
    const result = JSON.parse(jsonString);

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
