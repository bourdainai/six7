-- Fix update_membership_timestamp function missing search_path
-- This prevents search_path manipulation

DROP FUNCTION IF EXISTS update_membership_timestamp() CASCADE;

CREATE OR REPLACE FUNCTION update_membership_timestamp()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER update_membership_updated_at
  BEFORE UPDATE ON user_memberships
  FOR EACH ROW
  EXECUTE FUNCTION update_membership_timestamp();