import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { listingId } = await req.json();

    if (!listingId) {
      throw new Error('listingId is required');
    }

    console.log('Analyzing photos for listing:', listingId);

    // Get listing with images
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('*, listing_images(*)')
      .eq('id', listingId)
      .eq('seller_id', user.id)
      .single();

    if (listingError || !listing) {
      throw new Error('Listing not found or unauthorized');
    }

    const images = listing.listing_images || [];
    const advice: any[] = [];

    // Check number of photos
    if (images.length < 4) {
      advice.push({
        type: 'quantity',
        priority: 'high',
        title: 'Add More Photos',
        message: `You have ${images.length} photo(s). Add ${4 - images.length} more for better visibility.`,
        recommendation: 'Listings with 4+ photos sell 40% faster',
        missing_shots: getMissingShotTypes(images, listing.category),
      });
    }

    // Analyze photo quality scores
    const lowQualityPhotos = images.filter((img: any) => 
      (img.quality_score || 0) < 60
    );

    if (lowQualityPhotos.length > 0) {
      advice.push({
        type: 'quality',
        priority: 'high',
        title: 'Improve Photo Quality',
        message: `${lowQualityPhotos.length} photo(s) have quality issues`,
        issues: lowQualityPhotos.map((img: any) => ({
          image_id: img.id,
          quality_score: img.quality_score,
          lighting_score: img.lighting_score,
          angle_score: img.angle_score,
          background_score: img.background_score,
        })),
        recommendations: [
          'Use natural lighting or bright artificial light',
          'Keep camera steady to avoid blur',
          'Use a clean, plain background',
          'Photograph items straight-on and at eye level',
        ],
      });
    }

    // Check for specific angle coverage
    const hasFullView = images.some((img: any) => 
      (img.ai_analysis as any)?.angles?.includes('full_view')
    );
    const hasDetailShots = images.some((img: any) => 
      (img.ai_analysis as any)?.angles?.includes('detail')
    );
    const hasBackView = images.some((img: any) => 
      (img.ai_analysis as any)?.angles?.includes('back')
    );

    const missingAngles = [];
    if (!hasFullView) missingAngles.push('Full front view');
    if (!hasBackView) missingAngles.push('Back view');
    if (!hasDetailShots) missingAngles.push('Close-up details');

    if (missingAngles.length > 0) {
      advice.push({
        type: 'angles',
        priority: 'medium',
        title: 'Add Missing Angles',
        message: 'Add photos from different angles',
        missing_angles: missingAngles,
        recommendation: 'Show the item from multiple perspectives to build buyer confidence',
      });
    }

    // Check for damage documentation
    const hasDamage = images.some((img: any) => 
      (img.damage_detected as any)?.length > 0
    );

    if (hasDamage && !images.some((img: any) => 
      (img.ai_analysis as any)?.damage_documented === true
    )) {
      advice.push({
        type: 'damage',
        priority: 'medium',
        title: 'Document Condition Issues',
        message: 'Clearly photograph any flaws or wear',
        recommendation: 'Honest photos build trust and reduce disputes',
      });
    }

    // Check background
    const poorBackgrounds = images.filter((img: any) => 
      (img.background_score || 0) < 60
    );

    if (poorBackgrounds.length > 0) {
      advice.push({
        type: 'background',
        priority: 'low',
        title: 'Improve Background',
        message: `${poorBackgrounds.length} photo(s) have distracting backgrounds`,
        recommendation: 'Use a plain white, grey, or neutral background',
      });
    }

    // Overall score and summary
    const avgQuality = images.length > 0
      ? images.reduce((sum: number, img: any) => sum + (img.quality_score || 0), 0) / images.length
      : 0;

    const overallScore = Math.round(
      avgQuality * 0.6 +
      (images.length >= 4 ? 100 : (images.length / 4) * 100) * 0.4
    );

    console.log(`Photo analysis complete. Score: ${overallScore}, Advice items: ${advice.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          overall_score: overallScore,
          photo_count: images.length,
          average_quality: Math.round(avgQuality),
          advice,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in photo advisor:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function getMissingShotTypes(images: any[], category?: string): string[] {
  const missing = [];
  
  // Basic shots every listing should have
  if (images.length < 1) missing.push('Main product shot');
  if (images.length < 2) missing.push('Alternative angle');
  if (images.length < 3) missing.push('Detail close-up');
  if (images.length < 4) missing.push('Back or side view');

  // Category-specific recommendations
  if (category === 'Tops' || category === 'Dresses') {
    missing.push('Label/size tag close-up');
  }
  
  if (category === 'Shoes') {
    missing.push('Sole view', 'Size label inside');
  }

  if (category === 'Bags') {
    missing.push('Interior view', 'Handle/strap detail');
  }

  return missing.slice(0, 4 - images.length);
}
