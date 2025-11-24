-- Fix security warnings from previous migration

-- Fix function search_path for update_seller_credits_timestamp
CREATE OR REPLACE FUNCTION update_seller_credits_timestamp()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix function search_path for initialize_seller_credits
CREATE OR REPLACE FUNCTION initialize_seller_credits()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
BEGIN
  INSERT INTO seller_credits (user_id, balance, lifetime_earned, lifetime_used)
  VALUES (NEW.id, 0, 0, 0)
  ON CONFLICT DO NOTHING;
  
  -- Check if promo slots available (first 250)
  IF (SELECT COUNT(*) FROM promotional_signups) < 250 THEN
    INSERT INTO promotional_signups (user_id, promo_code, credits_awarded)
    VALUES (NEW.id, 'LAUNCH250', 200)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Protect admin_live_stats from public API access (materialized views can't have RLS, so we just revoke access)
REVOKE ALL ON admin_live_stats FROM PUBLIC;
GRANT SELECT ON admin_live_stats TO postgres;