-- Manually verify the super admin email
-- This updates the auth.users table to mark the email as confirmed

-- Update the admin user's email_confirmed_at timestamp
UPDATE auth.users
SET email_confirmed_at = NOW(),
    updated_at = NOW()
WHERE email = 'gavin@bourdain.co.uk'
  AND email_confirmed_at IS NULL;

-- Also update the profiles table to reflect verification
UPDATE public.profiles
SET email_verified = true,
    updated_at = NOW()
WHERE email = 'gavin@bourdain.co.uk';

-- Check if verification record exists and update/insert accordingly
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Get the admin user ID
  SELECT id INTO admin_user_id
  FROM public.profiles
  WHERE email = 'gavin@bourdain.co.uk';

  IF admin_user_id IS NOT NULL THEN
    -- Delete existing verification record if any
    DELETE FROM public.seller_verifications
    WHERE seller_id = admin_user_id AND verification_type = 'email';
    
    -- Insert new verified record
    INSERT INTO public.seller_verifications (seller_id, verification_type, status, verified_at)
    VALUES (admin_user_id, 'email', 'verified', NOW());
  END IF;
END $$;