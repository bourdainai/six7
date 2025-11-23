-- Add social verification types
ALTER TABLE seller_verifications 
  DROP CONSTRAINT IF EXISTS check_verification_type;

ALTER TABLE seller_verifications 
  ADD CONSTRAINT check_verification_type 
  CHECK (verification_type IN (
    'email', 'phone', 'id', 'business', 'address', 'bank_account',
    'linkedin', 'facebook', 'instagram', 'twitter'
  ));

-- Create table to store social profile data
CREATE TABLE IF NOT EXISTS social_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('linkedin', 'facebook', 'instagram', 'twitter')),
  provider_user_id TEXT NOT NULL,
  profile_data JSONB DEFAULT '{}'::jsonb,
  connection_count INTEGER,
  profile_age_days INTEGER,
  verified_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_validated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- Enable RLS on social_verifications
ALTER TABLE social_verifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own social verifications
CREATE POLICY "Users can view own social verifications"
ON social_verifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own social verifications
CREATE POLICY "Users can insert own social verifications"
ON social_verifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own social verifications
CREATE POLICY "Users can update own social verifications"
ON social_verifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Users can delete their own social verifications
CREATE POLICY "Users can delete own social verifications"
ON social_verifications
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Add columns to profiles for quick access
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS linkedin_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS facebook_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS instagram_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS twitter_verified BOOLEAN DEFAULT false;