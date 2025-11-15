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
    const { listingId } = await req.json();
    
    if (!listingId) {
      throw new Error("listingId is required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log(`Generating embedding for listing: ${listingId}`);

    // Fetch listing details
    const { data: listing, error: listingError } = await supabaseClient
      .from('listings')
      .select('title, description, category, subcategory, brand, color, material, style_tags, condition')
      .eq('id', listingId)
      .single();

    if (listingError) throw listingError;
    if (!listing) throw new Error("Listing not found");

    // Create rich text representation for embedding
    const embeddingText = [
      listing.title,
      listing.description,
      `Category: ${listing.category}`,
      listing.subcategory ? `Subcategory: ${listing.subcategory}` : '',
      listing.brand ? `Brand: ${listing.brand}` : '',
      listing.color ? `Color: ${listing.color}` : '',
      listing.material ? `Material: ${listing.material}` : '',
      listing.condition ? `Condition: ${listing.condition.replace(/_/g, ' ')}` : '',
      listing.style_tags ? `Style: ${JSON.parse(listing.style_tags as any).join(', ')}` : ''
    ].filter(Boolean).join('. ');

    console.log(`Embedding text: ${embeddingText.substring(0, 200)}...`);

    // Generate embedding using Lovable AI
    const embeddingResponse = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: embeddingText,
      }),
    });

    if (!embeddingResponse.ok) {
      const errorText = await embeddingResponse.text();
      console.error("Embedding API error:", embeddingResponse.status, errorText);
      throw new Error(`Embedding generation failed: ${embeddingResponse.status}`);
    }

    const embeddingData = await embeddingResponse.json();
    const embedding = embeddingData.data[0].embedding;

    console.log(`Generated embedding with ${embedding.length} dimensions`);

    // Store embedding in database
    const { error: upsertError } = await supabaseClient
      .from('listing_embeddings')
      .upsert({
        listing_id: listingId,
        embedding: embedding,
        model_used: 'text-embedding-3-small'
      }, {
        onConflict: 'listing_id'
      });

    if (upsertError) throw upsertError;

    return new Response(
      JSON.stringify({ 
        success: true, 
        listingId,
        embeddingDimensions: embedding.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error("Embedding generation error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
