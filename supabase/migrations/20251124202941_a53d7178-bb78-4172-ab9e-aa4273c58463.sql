-- Consolidate listings SELECT policies into one comprehensive policy

-- Drop the duplicate SELECT policies
DROP POLICY IF EXISTS "Anyone can view active listings" ON listings;
DROP POLICY IF EXISTS "Sellers can view all own listings" ON listings;

-- Create single comprehensive SELECT policy
CREATE POLICY "View active or own listings"
  ON listings
  FOR SELECT
  TO public
  USING (
    status = 'active'::listing_status
    OR 
    auth.uid() = seller_id
  );

-- Ensure listing_images are viewable with listings
DROP POLICY IF EXISTS "Listing images are publicly viewable" ON listing_images;
CREATE POLICY "Anyone can view listing images"
  ON listing_images
  FOR SELECT
  TO public
  USING (true);

-- Ensure pokemon card attributes are publicly viewable
DROP POLICY IF EXISTS "Pokemon card attributes are publicly viewable" ON pokemon_card_attributes;
CREATE POLICY "Anyone can view pokemon card attributes"
  ON pokemon_card_attributes
  FOR SELECT
  TO public
  USING (true);