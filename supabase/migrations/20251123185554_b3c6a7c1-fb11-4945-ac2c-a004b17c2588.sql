-- Fix RLS policies for seller_verifications table
CREATE POLICY "Users can request verifications for themselves"
ON seller_verifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Admins can update verification status"
ON seller_verifications
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete verifications"
ON seller_verifications
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create trigger to sync email verification from auth.users to profiles and seller_verifications
CREATE OR REPLACE FUNCTION sync_email_verification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND (OLD.email_confirmed_at IS NULL OR OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at) THEN
    -- Update profiles table
    UPDATE profiles
    SET email_verified = true,
        updated_at = now()
    WHERE id = NEW.id;
    
    -- Create or update seller_verifications record
    INSERT INTO seller_verifications (seller_id, verification_type, status, verified_at)
    VALUES (NEW.id, 'email', 'verified', NEW.email_confirmed_at)
    ON CONFLICT (seller_id, verification_type) 
    DO UPDATE SET 
      status = 'verified', 
      verified_at = NEW.email_confirmed_at,
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_email_verified
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_email_verification();