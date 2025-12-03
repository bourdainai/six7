-- Add English name column to pokemon_card_attributes for Japanese cards
-- This allows displaying English names while preserving original Japanese names

-- Add name_en column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pokemon_card_attributes' 
    AND column_name = 'name_en'
  ) THEN
    ALTER TABLE pokemon_card_attributes ADD COLUMN name_en VARCHAR(255);
  END IF;
END $$;

-- Create index for faster lookups on English name
CREATE INDEX IF NOT EXISTS idx_pokemon_card_attributes_name_en 
ON pokemon_card_attributes(name_en);

-- Create index on metadata for dexId lookups (used for mapping)
CREATE INDEX IF NOT EXISTS idx_pokemon_card_attributes_metadata_gin 
ON pokemon_card_attributes USING gin(metadata);

COMMENT ON COLUMN pokemon_card_attributes.name_en IS 'English name for non-English cards (e.g., Japanese cards). NULL for English cards.';

