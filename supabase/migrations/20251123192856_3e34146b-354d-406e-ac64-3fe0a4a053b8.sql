-- Add phone verification fields to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE;

-- Update seller_verifications to allow phone verification type
ALTER TABLE seller_verifications 
DROP CONSTRAINT IF EXISTS seller_verifications_verification_type_check;

ALTER TABLE seller_verifications
ADD CONSTRAINT seller_verifications_verification_type_check 
CHECK (verification_type IN ('email', 'phone'));