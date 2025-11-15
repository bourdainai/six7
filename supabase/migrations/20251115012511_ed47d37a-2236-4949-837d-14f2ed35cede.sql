-- Add flexible category attributes to support multiple item types
ALTER TABLE listings 
ADD COLUMN category_attributes JSONB DEFAULT '{}'::jsonb;

-- Add index for category filtering
CREATE INDEX idx_listings_category ON listings(category);

-- Add index for category attributes
CREATE INDEX idx_listings_category_attributes ON listings USING gin(category_attributes);

-- Update RLS policies remain the same as they're already flexible