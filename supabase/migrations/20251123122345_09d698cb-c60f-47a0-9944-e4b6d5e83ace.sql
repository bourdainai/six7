-- Fix security warning: Replace function with SECURITY DEFINER and search_path
CREATE OR REPLACE FUNCTION update_tcgdex_import_progress_timestamp()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;