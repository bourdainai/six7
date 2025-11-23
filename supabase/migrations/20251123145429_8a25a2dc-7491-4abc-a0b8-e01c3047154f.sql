-- Fix SECURITY DEFINER function missing search_path
-- This prevents privilege escalation via search_path manipulation

CREATE OR REPLACE FUNCTION initialize_user_membership()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO user_memberships (user_id, tier)
  VALUES (NEW.id, 'free');
  
  INSERT INTO seller_risk_ratings (seller_id, risk_tier)
  VALUES (NEW.id, 'A');
  
  RETURN NEW;
END;
$$;