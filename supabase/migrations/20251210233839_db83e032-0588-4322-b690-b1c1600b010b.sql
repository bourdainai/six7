-- Update the trigger function to include name_en and set_name_en in search vector
CREATE OR REPLACE FUNCTION public.update_pokemon_card_search_vector()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name_en, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.set_name_en, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.set_name, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.set_code, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.number, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.rarity, '')), 'C');
  RETURN NEW;
END;
$function$;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_pokemon_card_name_en ON pokemon_card_attributes(name_en) WHERE name_en IS NOT NULL;

COMMENT ON FUNCTION public.update_pokemon_card_search_vector() IS
  'Updates search_vector including both original and English names for multilingual search';