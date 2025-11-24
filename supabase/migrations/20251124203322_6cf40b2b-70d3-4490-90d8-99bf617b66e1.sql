
-- Clean up duplicate and conflicting RLS policies

-- Drop the duplicate/complex policies on listing_images
DROP POLICY IF EXISTS "Images visible with listing visibility" ON listing_images;

-- Drop the duplicate policy on pokemon_card_attributes  
DROP POLICY IF EXISTS "Anyone can view pokemon cards" ON pokemon_card_attributes;

-- Verify the simple policies remain:
-- listing_images: "Anyone can view listing images" USING (true)
-- pokemon_card_attributes: "Anyone can view pokemon card attributes" USING (true)
-- listings: "View active or own listings" USING (status = 'active' OR auth.uid() = seller_id)
-- profiles: "Public profiles are viewable by everyone" USING (true)
