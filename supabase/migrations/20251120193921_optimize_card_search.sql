-- Phase 1: Optimize Pokemon Card Search Performance
-- Add full-text search, popularity tracking, and sync metadata

-- Create sync_source enum
CREATE TYPE sync_source_type AS ENUM ('manual', 'cron', 'on_demand');

-- Add search and popularity columns to pokemon_card_attributes
ALTER TABLE pokemon_card_attributes 
  ADD COLUMN IF NOT EXISTS search_vector tsvector,
  ADD COLUMN IF NOT EXISTS popularity_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_searched_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS synced_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS sync_source sync_source_type;

-- Create function to update search_vector automatically
CREATE OR REPLACE FUNCTION update_pokemon_card_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.set_name, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.set_code, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.number, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.rarity, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update search_vector
DROP TRIGGER IF EXISTS pokemon_card_search_vector_update ON pokemon_card_attributes;
CREATE TRIGGER pokemon_card_search_vector_update
  BEFORE INSERT OR UPDATE ON pokemon_card_attributes
  FOR EACH ROW
  EXECUTE FUNCTION update_pokemon_card_search_vector();

-- Update existing rows to populate search_vector
UPDATE pokemon_card_attributes
SET search_vector = 
  setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(set_name, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(set_code, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(number, '')), 'C') ||
  setweight(to_tsvector('english', COALESCE(rarity, '')), 'C');

-- Create GIN index for full-text search (fast text search)
CREATE INDEX IF NOT EXISTS idx_pokemon_card_attributes_search_vector 
  ON pokemon_card_attributes USING GIN(search_vector);

-- Create composite index for exact card lookups (set_code + number)
CREATE INDEX IF NOT EXISTS idx_pokemon_card_attributes_set_number 
  ON pokemon_card_attributes(set_code, number);

-- Create index on number for number-only searches
CREATE INDEX IF NOT EXISTS idx_pokemon_card_attributes_number 
  ON pokemon_card_attributes(number);

-- Create index on name for name searches (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_pokemon_card_attributes_name_lower 
  ON pokemon_card_attributes(LOWER(name));

-- Create index on popularity_score for ranking popular cards
CREATE INDEX IF NOT EXISTS idx_pokemon_card_attributes_popularity 
  ON pokemon_card_attributes(popularity_score DESC NULLS LAST);

-- Create index on last_searched_at for identifying hot cards
CREATE INDEX IF NOT EXISTS idx_pokemon_card_attributes_last_searched 
  ON pokemon_card_attributes(last_searched_at DESC NULLS LAST);

-- Create index on synced_at to track sync freshness
CREATE INDEX IF NOT EXISTS idx_pokemon_card_attributes_synced_at 
  ON pokemon_card_attributes(synced_at DESC NULLS LAST);

-- Create function to increment card popularity when searched
CREATE OR REPLACE FUNCTION increment_card_popularity(card_ids VARCHAR(255)[])
RETURNS void AS $$
BEGIN
  UPDATE pokemon_card_attributes
  SET 
    popularity_score = COALESCE(popularity_score, 0) + 1,
    last_searched_at = NOW()
  WHERE card_id = ANY(card_ids);
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION increment_card_popularity(VARCHAR(255)[]) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_card_popularity(VARCHAR(255)[]) TO service_role;

-- Add comments for documentation
COMMENT ON COLUMN pokemon_card_attributes.search_vector IS 'Full-text search vector for fast text queries';
COMMENT ON COLUMN pokemon_card_attributes.popularity_score IS 'Tracks how frequently this card is searched (higher = more popular)';
COMMENT ON COLUMN pokemon_card_attributes.last_searched_at IS 'Timestamp of last search to identify hot cards';
COMMENT ON COLUMN pokemon_card_attributes.synced_at IS 'When this card was last synced from external API';
COMMENT ON COLUMN pokemon_card_attributes.sync_source IS 'How this card was synced: manual, cron, or on_demand';

