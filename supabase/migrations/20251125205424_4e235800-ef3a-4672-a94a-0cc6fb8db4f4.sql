-- Add accepts_offers column to listings table
ALTER TABLE public.listings
ADD COLUMN accepts_offers BOOLEAN NOT NULL DEFAULT true;

-- Add index for filtering
CREATE INDEX idx_listings_accepts_offers ON public.listings(accepts_offers) WHERE status = 'active';

COMMENT ON COLUMN public.listings.accepts_offers IS 'Whether the seller accepts offers on this listing. False = firm price only.';