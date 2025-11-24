-- Phase 2: Add Bundle Pricing Fields to listings table
ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS bundle_price numeric,
ADD COLUMN IF NOT EXISTS bundle_discount_percentage integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS bundle_type text DEFAULT 'none' CHECK (bundle_type IN ('none', 'bundle_with_discount', 'variants_only')),
ADD COLUMN IF NOT EXISTS original_bundle_price numeric,
ADD COLUMN IF NOT EXISTS remaining_bundle_price numeric;

-- Add variant tracking fields
ALTER TABLE public.listing_variants
ADD COLUMN IF NOT EXISTS is_sold boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS sold_at timestamp with time zone;

-- Create function to calculate remaining bundle price dynamically
CREATE OR REPLACE FUNCTION public.calculate_remaining_bundle_price(listing_id_param uuid)
RETURNS numeric AS $$
DECLARE
  result numeric;
BEGIN
  SELECT 
    COALESCE(l.original_bundle_price, 0) - COALESCE(SUM(lv.variant_price), 0)
  INTO result
  FROM listings l
  LEFT JOIN listing_variants lv ON lv.listing_id = l.id AND lv.is_sold = true
  WHERE l.id = listing_id_param
  GROUP BY l.original_bundle_price;
  
  RETURN GREATEST(COALESCE(result, 0), 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Create trigger to auto-update remaining bundle price when variant sells
CREATE OR REPLACE FUNCTION public.update_bundle_price_on_variant_sale()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if variant was marked as sold (not already sold)
  IF NEW.is_sold = true AND (OLD.is_sold IS NULL OR OLD.is_sold = false) THEN
    UPDATE listings 
    SET remaining_bundle_price = calculate_remaining_bundle_price(NEW.listing_id),
        updated_at = now()
    WHERE id = NEW.listing_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trigger_update_bundle_price ON public.listing_variants;
CREATE TRIGGER trigger_update_bundle_price
AFTER UPDATE OF is_sold ON public.listing_variants
FOR EACH ROW
EXECUTE FUNCTION public.update_bundle_price_on_variant_sale();

-- Add comment for documentation
COMMENT ON COLUMN public.listings.bundle_type IS 'Type of bundle: none (single item), bundle_with_discount (bundle with special price), variants_only (individual items without bundle discount)';
COMMENT ON COLUMN public.listings.original_bundle_price IS 'Original bundle price when all cards are available';
COMMENT ON COLUMN public.listings.remaining_bundle_price IS 'Current bundle price after some cards have sold individually';
COMMENT ON FUNCTION public.calculate_remaining_bundle_price IS 'Calculates the remaining bundle price by subtracting sold variant prices from original bundle price';