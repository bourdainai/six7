-- Fix remaining trigger functions missing search_path
-- This prevents search_path manipulation attacks

DROP FUNCTION IF EXISTS update_listing_saves_count() CASCADE;
CREATE OR REPLACE FUNCTION update_listing_saves_count()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.listings
    SET saves = COALESCE(saves, 0) + 1
    WHERE id = NEW.listing_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.listings
    SET saves = GREATEST(COALESCE(saves, 0) - 1, 0)
    WHERE id = OLD.listing_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP FUNCTION IF EXISTS update_seller_verification_level() CASCADE;
CREATE OR REPLACE FUNCTION update_seller_verification_level()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  UPDATE public.profiles
  SET verification_level = CASE
    WHEN (
      SELECT COUNT(*) FROM public.seller_verifications
      WHERE seller_id = NEW.seller_id
      AND status = 'verified'
      AND verification_type IN ('email', 'phone', 'id')
    ) = 3 THEN 'premium'
    WHEN (
      SELECT COUNT(*) FROM public.seller_verifications
      WHERE seller_id = NEW.seller_id
      AND status = 'verified'
      AND verification_type IN ('email', 'phone')
    ) = 2 THEN 'verified'
    WHEN (
      SELECT COUNT(*) FROM public.seller_verifications
      WHERE seller_id = NEW.seller_id
      AND status = 'verified'
      AND verification_type = 'email'
    ) = 1 THEN 'basic'
    ELSE 'unverified'
  END
  WHERE id = NEW.seller_id;
  
  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS update_support_ticket_timestamp() CASCADE;
CREATE OR REPLACE FUNCTION update_support_ticket_timestamp()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS update_seller_reputation_timestamp() CASCADE;
CREATE OR REPLACE FUNCTION update_seller_reputation_timestamp()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Recreate triggers
CREATE TRIGGER trigger_update_listing_saves
  AFTER INSERT OR DELETE ON public.saved_listings
  FOR EACH ROW
  EXECUTE FUNCTION update_listing_saves_count();

CREATE TRIGGER trigger_update_seller_verification_level
  AFTER INSERT OR UPDATE ON public.seller_verifications
  FOR EACH ROW
  EXECUTE FUNCTION update_seller_verification_level();

CREATE TRIGGER trigger_update_support_ticket_timestamp
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_support_ticket_timestamp();

CREATE TRIGGER update_seller_reputation_updated_at
  BEFORE UPDATE ON seller_reputation
  FOR EACH ROW
  EXECUTE FUNCTION update_seller_reputation_timestamp();