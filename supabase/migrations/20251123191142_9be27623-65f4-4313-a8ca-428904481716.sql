-- Remove social verification columns from profiles
ALTER TABLE profiles 
  DROP COLUMN IF EXISTS linkedin_verified,
  DROP COLUMN IF EXISTS facebook_verified,
  DROP COLUMN IF EXISTS instagram_verified,
  DROP COLUMN IF EXISTS twitter_verified;

-- Drop social_verifications table if exists
DROP TABLE IF EXISTS social_verifications;

-- Update seller_verifications to only allow email type
ALTER TABLE seller_verifications 
  DROP CONSTRAINT IF EXISTS seller_verifications_verification_type_check;

ALTER TABLE seller_verifications 
  ADD CONSTRAINT seller_verifications_verification_type_check 
  CHECK (verification_type = 'email');