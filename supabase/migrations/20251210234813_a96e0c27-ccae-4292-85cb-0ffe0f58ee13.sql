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

-- Add index on name_en for faster lookups
CREATE INDEX IF NOT EXISTS idx_pokemon_card_name_en ON pokemon_card_attributes(name_en) WHERE name_en IS NOT NULL;

-- Add index for finding cards needing translation (Japanese name, no English)
CREATE INDEX IF NOT EXISTS idx_pokemon_card_needs_translation
  ON pokemon_card_attributes(card_id)
  WHERE name_en IS NULL AND name ~ '[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]';

COMMENT ON FUNCTION public.update_pokemon_card_search_vector() IS
  'Updates search_vector including both original and English names for multilingual search';