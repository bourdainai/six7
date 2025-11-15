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

    console.log(`Running image forensics for listing: ${listing_id}`);

    // Fetch listing and images
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('*, listing_images(*)')
      .eq('id', listing_id)
      .single();

    if (listingError) throw listingError;
    if (!listing) throw new Error("Listing not found");

    const flags = [];
    let totalRiskScore = 0;

    // Check for stock photos
    const stockPhotoCount = listing.listing_images?.filter((img: any) => img.is_stock_photo).length || 0;
    if (stockPhotoCount > 0) {
      const stockPhotoRisk = Math.min(stockPhotoCount * 30, 80);
      totalRiskScore += stockPhotoRisk;
      flags.push({
        flag_type: 'stock_photo',
        risk_score: stockPhotoRisk,
        details: {
          stock_photo_count: stockPhotoCount,
          total_images: listing.listing_images?.length || 0,
          message: `${stockPhotoCount} stock photos detected`
        }
      });
    }

    // Check for counterfeit risk from image analysis
    const highCounterfeitRisk = listing.listing_images?.filter((img: any) => 
      (img.counterfeit_risk_score || 0) > 60
    ).length || 0;

    if (highCounterfeitRisk > 0) {
      const counterfeitRisk = Math.min(highCounterfeitRisk * 25, 70);
      totalRiskScore += counterfeitRisk;
      flags.push({
        flag_type: 'counterfeit_risk',
        risk_score: counterfeitRisk,
        details: {
          high_risk_images: highCounterfeitRisk,
          message: `${highCounterfeitRisk} images show potential counterfeit indicators`
        }
      });
    }

    // Check for missing key photos (low angle scores)
    const poorQualityImages = listing.listing_images?.filter((img: any) => 
      (img.quality_score || 0) < 40 || (img.angle_score || 0) < 40
    ).length || 0;

    if (poorQualityImages === listing.listing_images?.length && listing.listing_images?.length > 0) {
      const qualityRisk = 40;
      totalRiskScore += qualityRisk;
      flags.push({
        flag_type: 'suspicious_listing',
        risk_score: qualityRisk,
        details: {
          poor_quality_count: poorQualityImages,
          message: 'All images are poor quality - potential scam indicator'
        }
      });
    }

    // Insert fraud flags if any detected
    if (flags.length > 0) {
      for (const flag of flags) {
        await supabase.from('fraud_flags').insert({
          listing_id,
          user_id: listing.seller_id,
          flag_type: flag.flag_type,
          risk_score: flag.risk_score,
          details: flag.details,
          status: 'pending'
        });
      }

      console.log(`Created ${flags.length} fraud flags for listing ${listing_id}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        flags_created: flags.length,
        total_risk_score: Math.min(totalRiskScore, 100),
        flags 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in fraud-image-forensics:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred",
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
