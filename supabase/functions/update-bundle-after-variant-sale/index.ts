import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const updateSchema = z.object({
  listingId: z.string().uuid('Invalid listing ID format'),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { listingId } = updateSchema.parse(body);

    // Get listing with bundle info
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id, bundle_type, bundle_price, bundle_discount_percentage, has_variants')
      .eq('id', listingId)
      .single();

    if (listingError || !listing) {
      throw new Error('Listing not found');
    }

    // Only process if this is a variant-based bundle listing
    if (!listing.has_variants || !listing.bundle_type) {
      return new Response(
        JSON.stringify({ success: true, message: 'Not a bundle listing, no update needed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all available (unsold) variants
    const { data: availableVariants, error: variantsError } = await supabase
      .from('listing_variants')
      .select('id, variant_price, variant_quantity, is_available, is_sold')
      .eq('listing_id', listingId)
      .eq('is_sold', false);

    if (variantsError) {
      throw new Error(`Failed to fetch variants: ${variantsError.message}`);
    }

    if (!availableVariants || availableVariants.length === 0) {
      // All variants sold - update listing to sold
      await supabase
        .from('listings')
        .update({ status: 'sold', remaining_bundle_price: null })
        .eq('id', listingId);
      
      return new Response(
        JSON.stringify({ success: true, message: 'All variants sold, listing marked as sold' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate new bundle price based on remaining variants
    const individualTotal = availableVariants.reduce((sum, v) => {
      // Only count available variants with quantity > 0
      if (v.is_available && !v.is_sold && v.variant_quantity > 0) {
        return sum + Number(v.variant_price);
      }
      return sum;
    }, 0);

    // Recalculate bundle price if discount mode
    let newBundlePrice = null;
    let newDiscountPercentage = null;
    let remainingBundlePrice = null;

    if (listing.bundle_type === 'bundle_with_discount' && listing.bundle_discount_percentage) {
      // Calculate discount based on remaining variants
      if (availableVariants.filter(v => v.is_available && !v.is_sold && v.variant_quantity > 0).length >= 2) {
        newDiscountPercentage = listing.bundle_discount_percentage;
        newBundlePrice = individualTotal * (1 - (listing.bundle_discount_percentage / 100));
        remainingBundlePrice = newBundlePrice;
      } else {
        // Only 1 variant left - no discount applies
        newDiscountPercentage = 0;
        newBundlePrice = individualTotal;
        remainingBundlePrice = newBundlePrice;
      }
    } else if (listing.bundle_type === 'variants_only') {
      // No bundle discount, just sum of individual prices
      newBundlePrice = individualTotal;
      remainingBundlePrice = individualTotal;
    }

    // Update listing with new bundle pricing
    const updateData: any = {
      remaining_bundle_price: remainingBundlePrice,
    };

    // Only update bundle_price and discount if they changed significantly (more than 0.01 difference)
    if (newBundlePrice !== null && listing.bundle_price !== null) {
      const priceDiff = Math.abs(Number(newBundlePrice) - Number(listing.bundle_price));
      if (priceDiff > 0.01) {
        updateData.bundle_price = newBundlePrice;
      }
    }

    if (newDiscountPercentage !== null && listing.bundle_discount_percentage !== null) {
      const discountDiff = Math.abs(Number(newDiscountPercentage) - Number(listing.bundle_discount_percentage));
      if (discountDiff > 0.01) {
        updateData.bundle_discount_percentage = newDiscountPercentage;
      }
    }

    // Update listing
    const { error: updateError } = await supabase
      .from('listings')
      .update(updateData)
      .eq('id', listingId);

    if (updateError) {
      throw new Error(`Failed to update listing: ${updateError.message}`);
    }

    console.log(`Updated bundle pricing for listing ${listingId}:`, {
      remainingVariants: availableVariants.length,
      newBundlePrice,
      newDiscountPercentage,
      remainingBundlePrice,
    });

    return new Response(
      JSON.stringify({
        success: true,
        listingId,
        remainingVariants: availableVariants.length,
        newBundlePrice,
        newDiscountPercentage,
        remainingBundlePrice,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error updating bundle after variant sale:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: errorMessage.includes('not found') ? 404 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});


