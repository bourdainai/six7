-- Fix RLS policies for listings to ensure they work for both authenticated and anonymous users

-- Drop existing policy that might be causing issues
DROP POLICY IF EXISTS "Published listings are viewable by everyone" ON listings;

-- Create new policy that explicitly allows both authenticated and anonymous users
CREATE POLICY "Anyone can view active listings"
  ON listings
  FOR SELECT
  USING (
    status = 'active'
    OR 
    (auth.uid() IS NOT NULL AND auth.uid() = seller_id)
  );

-- Ensure authenticated users can see their own listings regardless of status
CREATE POLICY "Sellers can view all own listings"
  ON listings
  FOR SELECT
  USING (auth.uid() = seller_id);