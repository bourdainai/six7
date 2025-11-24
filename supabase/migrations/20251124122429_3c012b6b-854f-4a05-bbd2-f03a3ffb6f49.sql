-- Create listing_variants table for variant-based listings (like Shopify variants)
CREATE TABLE IF NOT EXISTS public.listing_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  variant_name TEXT NOT NULL,
  variant_price NUMERIC NOT NULL CHECK (variant_price >= 0),
  variant_condition condition_type,
  variant_quantity INTEGER NOT NULL DEFAULT 1 CHECK (variant_quantity >= 0),
  variant_images JSONB DEFAULT '[]'::jsonb,
  card_id VARCHAR REFERENCES public.pokemon_card_attributes(card_id),
  is_available BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_listing_variants_listing_id ON public.listing_variants(listing_id);
CREATE INDEX idx_listing_variants_card_id ON public.listing_variants(card_id);
CREATE INDEX idx_listing_variants_available ON public.listing_variants(is_available) WHERE is_available = true;

-- Add updated_at trigger
CREATE TRIGGER update_listing_variants_updated_at
  BEFORE UPDATE ON public.listing_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Enable RLS
ALTER TABLE public.listing_variants ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can view available variants for active listings
CREATE POLICY "Variants visible with parent listing"
  ON public.listing_variants
  FOR SELECT
  USING (
    is_available = true 
    AND EXISTS (
      SELECT 1 FROM public.listings 
      WHERE listings.id = listing_variants.listing_id 
      AND listings.status = 'active'
    )
  );

-- Sellers can view all their listing variants (including unavailable)
CREATE POLICY "Sellers can view own listing variants"
  ON public.listing_variants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.listings 
      WHERE listings.id = listing_variants.listing_id 
      AND listings.seller_id = auth.uid()
    )
  );

-- Sellers can insert variants for own listings
CREATE POLICY "Sellers can insert variants for own listings"
  ON public.listing_variants
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.listings 
      WHERE listings.id = listing_variants.listing_id 
      AND listings.seller_id = auth.uid()
    )
  );

-- Sellers can update own listing variants
CREATE POLICY "Sellers can update own listing variants"
  ON public.listing_variants
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.listings 
      WHERE listings.id = listing_variants.listing_id 
      AND listings.seller_id = auth.uid()
    )
  );

-- Sellers can delete own listing variants
CREATE POLICY "Sellers can delete own listing variants"
  ON public.listing_variants
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.listings 
      WHERE listings.id = listing_variants.listing_id 
      AND listings.seller_id = auth.uid()
    )
  );

-- Add variant_id column to order_items for tracking which variant was purchased
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.listing_variants(id);

-- Create index for variant orders
CREATE INDEX IF NOT EXISTS idx_order_items_variant_id ON public.order_items(variant_id);

-- Add has_variants flag to listings table for quick filtering
ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS has_variants BOOLEAN DEFAULT false;

-- Create index for variant-enabled listings
CREATE INDEX IF NOT EXISTS idx_listings_has_variants ON public.listings(has_variants) WHERE has_variants = true;