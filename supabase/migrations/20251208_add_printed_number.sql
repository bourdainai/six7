-- Add printed_number column to store the exact card number as printed on the card
-- e.g., "125/094" for card 125 in a set with 94 printed cards

-- Add the column
ALTER TABLE pokemon_card_attributes
ADD COLUMN IF NOT EXISTS printed_number TEXT;

-- Backfill existing data by combining number and printed_total
-- Format: number/printed_total with printed_total padded to 3 digits
UPDATE pokemon_card_attributes
SET printed_number = number || '/' || LPAD(COALESCE(printed_total::text, ''), 3, '0')
WHERE printed_total IS NOT NULL 
  AND number IS NOT NULL
  AND printed_number IS NULL;

-- For cards without printed_total, just use the number
UPDATE pokemon_card_attributes
SET printed_number = number
WHERE printed_total IS NULL 
  AND number IS NOT NULL
  AND printed_number IS NULL;

-- Create index for fast searching
CREATE INDEX IF NOT EXISTS idx_pokemon_cards_printed_number 
ON pokemon_card_attributes (printed_number);

-- Create a GIN index for partial text matching (faster ILIKE searches)
CREATE INDEX IF NOT EXISTS idx_pokemon_cards_printed_number_gin 
ON pokemon_card_attributes USING gin (printed_number gin_trgm_ops);

-- Also fix the display_number column by recalculating it
UPDATE pokemon_card_attributes
SET display_number = number || '/' || LPAD(COALESCE(printed_total::text, ''), 3, '0')
WHERE printed_total IS NOT NULL 
  AND number IS NOT NULL;

