-- Add fields for full printed card number format
ALTER TABLE pokemon_card_attributes 
ADD COLUMN printed_total integer,
ADD COLUMN display_number text GENERATED ALWAYS AS (
  CASE 
    WHEN printed_total IS NOT NULL THEN number || '/' || printed_total
    ELSE number
  END
) STORED,
ADD COLUMN search_number text GENERATED ALWAYS AS (
  LOWER(
    CASE 
      WHEN printed_total IS NOT NULL THEN number || '/' || printed_total
      ELSE number
    END
  )
) STORED;

-- Create index for fast set-scoped searches
CREATE INDEX idx_pokemon_cards_set_search ON pokemon_card_attributes(set_code, search_number);
CREATE INDEX idx_pokemon_cards_set_number ON pokemon_card_attributes(set_code, number);

-- Update search vector to include display number
DROP TRIGGER IF EXISTS update_pokemon_card_search_vector ON pokemon_card_attributes;

CREATE OR REPLACE FUNCTION update_pokemon_card_search_vector()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.set_name, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.set_code, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.display_number, NEW.number, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.rarity, '')), 'C');
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_pokemon_card_search_vector
BEFORE INSERT OR UPDATE ON pokemon_card_attributes
FOR EACH ROW
EXECUTE FUNCTION update_pokemon_card_search_vector();