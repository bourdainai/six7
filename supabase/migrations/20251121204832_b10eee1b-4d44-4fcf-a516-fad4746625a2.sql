-- Add metadata column for storing additional card data from various sources
ALTER TABLE pokemon_card_attributes 
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN pokemon_card_attributes.metadata IS 'Additional card metadata from various sources (TCGdex, etc.) including HP, abilities, attacks, weaknesses, resistances, retreat cost, variants, and legal status';