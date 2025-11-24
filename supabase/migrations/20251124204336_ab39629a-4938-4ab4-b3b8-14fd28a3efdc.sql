-- Fix Browse Page - Update RLS policy to handle status properly
-- The issue is the enum type casting in the policy

-- Drop the existing policy
DROP POLICY IF EXISTS "View active or own listings" ON listings;

-- Create a simpler policy that works correctly
CREATE POLICY "View active or own listings"
  ON listings FOR SELECT
  TO public
  USING (
    status::text = 'active' OR auth.uid() = seller_id
  );