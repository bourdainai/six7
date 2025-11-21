-- Add short_id generated column for SEO-friendly listing URLs
ALTER TABLE public.listings
ADD COLUMN IF NOT EXISTS short_id text GENERATED ALWAYS AS (left(id::text, 8)) STORED;

-- Create index for fast lookup by short_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_listings_short_id ON public.listings(short_id);