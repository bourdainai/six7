-- Fix SECURITY DEFINER functions by adding fixed search_path
-- This prevents privilege escalation via search_path manipulation

-- 1. Fix update_listing_search_vector
CREATE OR REPLACE FUNCTION public.update_listing_search_vector()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.brand, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.category, '')), 'B');
  RETURN NEW;
END;
$function$;

-- 2. Fix refresh_listing_facets
CREATE OR REPLACE FUNCTION public.refresh_listing_facets()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY listing_facets;
END;
$function$;

-- 3. Fix get_next_set_to_sync
CREATE OR REPLACE FUNCTION public.get_next_set_to_sync()
RETURNS TABLE(set_code character varying, set_name character varying, priority_tier integer, last_page_synced integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    sp.set_code,
    sp.set_name,
    sp.priority_tier,
    sp.last_page_synced
  FROM tcg_sync_progress sp
  WHERE sp.sync_status IN ('pending', 'in_progress')
  ORDER BY sp.priority_tier ASC, sp.last_sync_at ASC NULLS FIRST
  LIMIT 1;
END;
$function$;

-- 4. Fix update_pokemon_card_search_vector
CREATE OR REPLACE FUNCTION public.update_pokemon_card_search_vector()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

-- 5. Fix increment_card_popularity
CREATE OR REPLACE FUNCTION public.increment_card_popularity(card_ids character varying[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  UPDATE pokemon_card_attributes
  SET 
    popularity_score = COALESCE(popularity_score, 0) + 1,
    last_searched_at = NOW()
  WHERE card_id = ANY(card_ids);
END;
$function$;