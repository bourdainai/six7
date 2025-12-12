-- Update neo2 cards with printed_total = 75 (Neo Discovery has 75 cards)
UPDATE pokemon_card_attributes 
SET printed_total = 75
WHERE set_code = 'neo2' 
  AND card_id NOT LIKE 'tcgdex_ja_%'
  AND printed_total IS NULL;

-- Update other common sets with known printed_totals
-- Base Set: 102 cards
UPDATE pokemon_card_attributes 
SET printed_total = 102
WHERE set_code = 'base1' 
  AND card_id NOT LIKE 'tcgdex_ja_%'
  AND printed_total IS NULL;

-- Jungle: 64 cards
UPDATE pokemon_card_attributes 
SET printed_total = 64
WHERE set_code = 'base2' 
  AND card_id NOT LIKE 'tcgdex_ja_%'
  AND printed_total IS NULL;

-- Fossil: 62 cards
UPDATE pokemon_card_attributes 
SET printed_total = 62
WHERE set_code = 'base3' 
  AND card_id NOT LIKE 'tcgdex_ja_%'
  AND printed_total IS NULL;

-- Base Set 2: 130 cards
UPDATE pokemon_card_attributes 
SET printed_total = 130
WHERE set_code = 'base4' 
  AND card_id NOT LIKE 'tcgdex_ja_%'
  AND printed_total IS NULL;

-- Neo Genesis: 111 cards
UPDATE pokemon_card_attributes 
SET printed_total = 111
WHERE set_code = 'neo1' 
  AND card_id NOT LIKE 'tcgdex_ja_%'
  AND printed_total IS NULL;

-- Neo Revelation: 66 cards
UPDATE pokemon_card_attributes 
SET printed_total = 66
WHERE set_code = 'neo3' 
  AND card_id NOT LIKE 'tcgdex_ja_%'
  AND printed_total IS NULL;

-- Neo Destiny: 113 cards  
UPDATE pokemon_card_attributes 
SET printed_total = 113
WHERE set_code = 'neo4' 
  AND card_id NOT LIKE 'tcgdex_ja_%'
  AND printed_total IS NULL;

-- Gym Heroes: 132 cards
UPDATE pokemon_card_attributes 
SET printed_total = 132
WHERE set_code = 'gym1' 
  AND card_id NOT LIKE 'tcgdex_ja_%'
  AND printed_total IS NULL;

-- Gym Challenge: 132 cards
UPDATE pokemon_card_attributes 
SET printed_total = 132
WHERE set_code = 'gym2' 
  AND card_id NOT LIKE 'tcgdex_ja_%'
  AND printed_total IS NULL;

-- Now drop and recreate the search_number column with multi-format support
-- This will enable searching for "2/75", "02/75", and "002/75" all at once

ALTER TABLE pokemon_card_attributes
DROP COLUMN IF EXISTS search_number;

ALTER TABLE pokemon_card_attributes
ADD COLUMN search_number text GENERATED ALWAYS AS (
  CASE
    WHEN printed_total IS NOT NULL THEN
      -- Include multiple formats: "2 2/75 02/75 002/75"
      lower(
        number::text || ' ' ||
        number::text || '/' || printed_total::text || ' ' ||
        lpad(number::text, 2, '0') || '/' || printed_total::text || ' ' ||
        lpad(number::text, 3, '0') || '/' || printed_total::text
      )
    ELSE
      lower(coalesce(number::text, ''))
  END
) STORED;