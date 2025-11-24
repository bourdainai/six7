-- Fix security warnings: Set search_path on function
CREATE OR REPLACE FUNCTION public.update_review_prefs_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;