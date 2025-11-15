-- Fix function with proper CASCADE
DROP FUNCTION IF EXISTS update_embedding_timestamp() CASCADE;

CREATE OR REPLACE FUNCTION update_embedding_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate the trigger
CREATE TRIGGER update_listing_embeddings_timestamp
  BEFORE UPDATE ON listing_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION update_embedding_timestamp();