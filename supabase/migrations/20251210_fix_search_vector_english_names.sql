-- Fix search_vector to include English names for Japanese cards
-- This allows searching "Charizard" to find Japanese cards with name_en = "Charizard"

-- Update the trigger function to include name_en and set_name_en in search vector
CREATE OR REPLACE FUNCTION public.update_pokemon_card_search_vector()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  NEW.search_vector :=
    -- English name gets highest priority (weight A)
    setweight(to_tsvector('english', COALESCE(NEW.name_en, '')), 'A') ||
    -- Original name also weight A (catches both English cards and Japanese chars)
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    -- English set name weight B
    setweight(to_tsvector('english', COALESCE(NEW.set_name_en, '')), 'B') ||
    -- Original set name weight B
    setweight(to_tsvector('english', COALESCE(NEW.set_name, '')), 'B') ||
    -- Set code weight B
    setweight(to_tsvector('english', COALESCE(NEW.set_code, '')), 'B') ||
    -- Card number weight C
    setweight(to_tsvector('english', COALESCE(NEW.number, '')), 'C') ||
    -- Rarity weight C
    setweight(to_tsvector('english', COALESCE(NEW.rarity, '')), 'C');
  RETURN NEW;
END;
$function$;

-- Rebuild search vectors for ALL cards to include English names
-- This runs in batches to avoid timeout
DO $$
DECLARE
  batch_size INT := 5000;
  total_updated INT := 0;
  batch_updated INT;
BEGIN
  LOOP
    UPDATE pokemon_card_attributes
    SET search_vector =
      setweight(to_tsvector('english', COALESCE(name_en, '')), 'A') ||
      setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
      setweight(to_tsvector('english', COALESCE(set_name_en, '')), 'B') ||
      setweight(to_tsvector('english', COALESCE(set_name, '')), 'B') ||
      setweight(to_tsvector('english', COALESCE(set_code, '')), 'B') ||
      setweight(to_tsvector('english', COALESCE(number, '')), 'C') ||
      setweight(to_tsvector('english', COALESCE(rarity, '')), 'C')
    WHERE card_id IN (
      SELECT card_id FROM pokemon_card_attributes
      WHERE search_vector IS NULL
         OR search_vector::text NOT LIKE '%' || COALESCE(NULLIF(name_en, ''), 'XNONENX') || '%'
      LIMIT batch_size
    );

    GET DIAGNOSTICS batch_updated = ROW_COUNT;
    total_updated := total_updated + batch_updated;

    EXIT WHEN batch_updated = 0;

    RAISE NOTICE 'Updated % cards (total: %)', batch_updated, total_updated;
  END LOOP;

  RAISE NOTICE 'Search vector rebuild complete. Total cards updated: %', total_updated;
END $$;

-- Add index on name_en for faster lookups
CREATE INDEX IF NOT EXISTS idx_pokemon_card_name_en ON pokemon_card_attributes(name_en) WHERE name_en IS NOT NULL;

-- Add index for finding cards needing translation (Japanese name, no English)
CREATE INDEX IF NOT EXISTS idx_pokemon_card_needs_translation
  ON pokemon_card_attributes(card_id)
  WHERE name_en IS NULL AND name ~ '[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]';

COMMENT ON FUNCTION public.update_pokemon_card_search_vector() IS
  'Updates search_vector including both original and English names for multilingual search';
