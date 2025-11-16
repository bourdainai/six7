-- Enable pg_trgm extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add full-text search column to listings
ALTER TABLE listings ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create function to update search vector
CREATE OR REPLACE FUNCTION update_listing_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.brand, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.category, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update search vector
DROP TRIGGER IF EXISTS listings_search_vector_update ON listings;
CREATE TRIGGER listings_search_vector_update
  BEFORE INSERT OR UPDATE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION update_listing_search_vector();

-- Create GIN index for full-text search
CREATE INDEX IF NOT EXISTS listings_search_vector_idx ON listings USING GIN(search_vector);

-- Create trigram indexes for fuzzy matching
CREATE INDEX IF NOT EXISTS listings_title_trgm_idx ON listings USING GIN(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS listings_brand_trgm_idx ON listings USING GIN(brand gin_trgm_ops);

-- Update existing listings with search vectors
UPDATE listings SET search_vector = 
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(brand, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(category, '')), 'B')
WHERE search_vector IS NULL;

-- Create search analytics table
CREATE TABLE IF NOT EXISTS search_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query text NOT NULL,
  search_type text NOT NULL,
  user_id uuid REFERENCES profiles(id),
  results_count integer DEFAULT 0,
  clicked_listing_id uuid REFERENCES listings(id),
  created_at timestamptz DEFAULT now()
);

-- Create index for popular queries
CREATE INDEX IF NOT EXISTS search_analytics_query_idx ON search_analytics(query);
CREATE INDEX IF NOT EXISTS search_analytics_created_at_idx ON search_analytics(created_at DESC);

-- Create materialized view for faceted filtering
CREATE MATERIALIZED VIEW IF NOT EXISTS listing_facets AS
SELECT 
  category,
  COUNT(*) as count,
  AVG(seller_price) as avg_price,
  MIN(seller_price) as min_price,
  MAX(seller_price) as max_price
FROM listings
WHERE status = 'active'
GROUP BY category
UNION ALL
SELECT 
  brand as category,
  COUNT(*) as count,
  AVG(seller_price) as avg_price,
  MIN(seller_price) as min_price,
  MAX(seller_price) as max_price
FROM listings
WHERE status = 'active' AND brand IS NOT NULL
GROUP BY brand;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS listing_facets_category_idx ON listing_facets(category);

-- Create function to refresh facets
CREATE OR REPLACE FUNCTION refresh_listing_facets()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY listing_facets;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on search_analytics
ALTER TABLE search_analytics ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own search analytics
CREATE POLICY "Users can insert their search analytics"
  ON search_analytics FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Allow users to view their own search analytics
CREATE POLICY "Users can view their search analytics"
  ON search_analytics FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);