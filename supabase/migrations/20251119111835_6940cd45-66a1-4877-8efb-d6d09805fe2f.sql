-- Fix SECURITY DEFINER functions to have fixed search_path
-- This prevents search_path manipulation attacks

-- 1. Fix update_embedding_timestamp
CREATE OR REPLACE FUNCTION public.update_embedding_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- 2. Fix initialize_user_membership
CREATE OR REPLACE FUNCTION public.initialize_user_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  INSERT INTO user_memberships (user_id, tier)
  VALUES (NEW.id, 'free');
  
  INSERT INTO seller_risk_ratings (seller_id, risk_tier)
  VALUES (NEW.id, 'A');
  
  RETURN NEW;
END;
$function$;

-- 3. Fix increment_gmv
CREATE OR REPLACE FUNCTION public.increment_gmv(p_user_id uuid, p_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  UPDATE user_memberships
  SET monthly_gmv_counter = monthly_gmv_counter + p_amount
  WHERE user_id = p_user_id;
END;
$function$;

-- 4. Fix handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'seller'), (NEW.id, 'buyer');
  
  RETURN NEW;
END;
$function$;

-- 5. Fix ensure_admin_role
CREATE OR REPLACE FUNCTION public.ensure_admin_role()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Find user by email
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'gavin@bourdain.co.uk'
  LIMIT 1;

  -- If user exists, ensure they have admin role
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END;
$function$;