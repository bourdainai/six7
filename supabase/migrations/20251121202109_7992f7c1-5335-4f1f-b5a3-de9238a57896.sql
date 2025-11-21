-- First, update the trigger function to work without display_number temporarily
CREATE OR REPLACE FUNCTION public.update_pokemon_card_search_vector()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.set_name, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.set_code, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.number, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.rarity, '')), 'C');
  RETURN NEW;
END;
$function$;

-- Drop generated columns
ALTER TABLE pokemon_card_attributes 
  DROP COLUMN IF EXISTS display_number CASCADE,
  DROP COLUMN IF EXISTS search_number CASCADE;

-- Fix printed_total for sv4 (Paradox Rift)
UPDATE pokemon_card_attributes
SET printed_total = 182
WHERE set_code = 'sv4';

-- Recreate display_number with proper zero-padding
ALTER TABLE pokemon_card_attributes
ADD COLUMN display_number text GENERATED ALWAYS AS (
  CASE
    WHEN printed_total >= 100 THEN LPAD(number, 3, '0') || '/' || printed_total::text
    WHEN printed_total >= 10 THEN LPAD(number, 2, '0') || '/' || printed_total::text
    WHEN printed_total IS NOT NULL THEN number || '/' || printed_total::text
    ELSE number
  END
) STORED;

-- Recreate search_number
ALTER TABLE pokemon_card_attributes
ADD COLUMN search_number text GENERATED ALWAYS AS (
  LOWER(REPLACE(
    CASE
      WHEN printed_total >= 100 THEN LPAD(number, 3, '0') || '/' || printed_total::text
      WHEN printed_total >= 10 THEN LPAD(number, 2, '0') || '/' || printed_total::text
      WHEN printed_total IS NOT NULL THEN number || '/' || printed_total::text
      ELSE number
    END,
    ' ', ''
  ))
) STORED;

-- Update the trigger function to use the new display_number column
CREATE OR REPLACE FUNCTION public.update_pokemon_card_search_vector()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.set_name, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.set_code, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.number, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.rarity, '')), 'C');
  RETURN NEW;
END;
$function$;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_pokemon_search_number ON pokemon_card_attributes(search_number);
CREATE INDEX IF NOT EXISTS idx_pokemon_set_number ON pokemon_card_attributes(set_code, number);