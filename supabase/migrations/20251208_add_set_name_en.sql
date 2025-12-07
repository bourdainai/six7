-- Add set_name_en column for English translations of Japanese set names
ALTER TABLE pokemon_card_attributes
ADD COLUMN IF NOT EXISTS set_name_en TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pokemon_cards_set_name_en 
ON pokemon_card_attributes (set_name_en);

-- Backfill set_name_en from English cards where we have matching set_codes
-- This uses cross-matching: find English cards with same set_code and copy their set_name
UPDATE pokemon_card_attributes ja
SET set_name_en = (
  SELECT DISTINCT en.set_name 
  FROM pokemon_card_attributes en 
  WHERE en.set_code = ja.set_code 
    AND en.card_id LIKE 'github_%'
  LIMIT 1
)
WHERE ja.card_id LIKE 'tcgdex_ja_%'
  AND ja.set_name_en IS NULL;

-- For cards where we couldn't find a match, try tcgdex_en_ prefix
UPDATE pokemon_card_attributes ja
SET set_name_en = (
  SELECT DISTINCT en.set_name 
  FROM pokemon_card_attributes en 
  WHERE en.set_code = ja.set_code 
    AND en.card_id LIKE 'tcgdex_en_%'
  LIMIT 1
)
WHERE ja.card_id LIKE 'tcgdex_ja_%'
  AND ja.set_name_en IS NULL;

