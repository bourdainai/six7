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
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Checking for duplicate listings: ${listing_id}`);

    // Fetch the target listing
    const { data: targetListing, error: targetError } = await supabase
      .from('listings')
      .select('*')
      .eq('id', listing_id)
      .single();

    if (targetError) throw targetError;
    if (!targetListing) throw new Error("Listing not found");

    // Find potential duplicates by same seller with very similar details
    const { data: similarListings, error: similarError } = await supabase
      .from('listings')
      .select('*')
      .eq('seller_id', targetListing.seller_id)
      .neq('id', listing_id)
      .eq('status', 'active');

    if (similarError) throw similarError;

    const duplicates = [];
    const flags = [];

    for (const listing of similarListings || []) {
      let similarityScore = 0;

      // Check title similarity (simple word overlap)
      const targetWords = new Set(targetListing.title.toLowerCase().split(/\s+/));
      const listingWords = new Set(listing.title.toLowerCase().split(/\s+/));
      const commonWords = [...targetWords].filter(w => listingWords.has(w));
      const titleSimilarity = commonWords.length / Math.max(targetWords.size, listingWords.size);
      
      if (titleSimilarity > 0.7) similarityScore += 40;

      // Check exact matches
      if (listing.brand === targetListing.brand && listing.brand) similarityScore += 15;
      if (listing.color === targetListing.color && listing.color) similarityScore += 10;
      if (listing.size === targetListing.size && listing.size) similarityScore += 10;
      if (listing.condition === targetListing.condition) similarityScore += 10;
      
      // Check price similarity (within 5%)
      const priceDiff = Math.abs(listing.seller_price - targetListing.seller_price) / targetListing.seller_price;
      if (priceDiff < 0.05) similarityScore += 15;

      if (similarityScore > 60) {
        duplicates.push({
          listing_id: listing.id,
          similarity_score: similarityScore,
          title: listing.title
        });
      }
    }

    // Create fraud flag if duplicates found
    if (duplicates.length > 0) {
      const riskScore = Math.min(duplicates.length * 30, 80);
      
      await supabase.from('fraud_flags').insert({
        listing_id,
        user_id: targetListing.seller_id,
        flag_type: 'duplicate_listing',
        risk_score: riskScore,
        details: {
          duplicate_count: duplicates.length,
          duplicates: duplicates.map(d => ({ id: d.listing_id, score: d.similarity_score })),
          message: `Found ${duplicates.length} potential duplicate listings by same seller`
        },
        status: 'pending'
      });

      flags.push({
        flag_type: 'duplicate_listing',
        risk_score: riskScore,
        duplicate_count: duplicates.length
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        duplicates_found: duplicates.length,
        flags_created: flags.length,
        duplicates 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in fraud-duplicate-detector:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred",
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
