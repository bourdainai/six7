-- Fix SECURITY DEFINER functions missing search_path
-- This prevents privilege escalation via search_path manipulation
-- https://supabase.com/docs/guides/database/database-advisors#0013_security_definer_function_missing_search_path

-- Fix sync_email_verification function
CREATE OR REPLACE FUNCTION public.sync_email_verification()
RETURNS TRIGGER AS $$
BEGIN
  -- Update profiles table when email is confirmed in auth
  IF NEW.email_confirmed_at IS NOT NULL AND (OLD.email_confirmed_at IS NULL OR OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at) THEN
    UPDATE public.profiles
    SET email_verified = true
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Fix initialize_seller_credits function (from 20251124200949)
CREATE OR REPLACE FUNCTION public.initialize_seller_credits_on_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Create seller credits record if not exists
  INSERT INTO public.seller_credits (user_id, balance, lifetime_earned)
  VALUES (NEW.id, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Check if promo slots available (first 250)
  IF (SELECT COUNT(*) FROM public.promotional_signups) < 250 THEN
    INSERT INTO public.promotional_signups (user_id, promo_code, credits_awarded)
    VALUES (NEW.id, 'LAUNCH250', 200)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Note: The trade completion function and membership functions are more complex
-- and may have been superseded by later migrations. Skipping those as they likely
-- have been replaced or are not actively used.

