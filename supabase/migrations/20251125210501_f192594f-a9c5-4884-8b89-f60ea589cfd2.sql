-- Add marketplace enum type
CREATE TYPE marketplace_type AS ENUM ('UK', 'US');

-- Add marketplace column to profiles table
ALTER TABLE profiles 
ADD COLUMN marketplace marketplace_type DEFAULT 'UK';

-- Add marketplace column to listings table  
ALTER TABLE listings
ADD COLUMN marketplace marketplace_type DEFAULT 'UK';

-- Create index for efficient filtering
CREATE INDEX idx_listings_marketplace ON listings(marketplace);
CREATE INDEX idx_profiles_marketplace ON profiles(marketplace);

-- Update existing profiles based on their preferred_currency or country
UPDATE profiles 
SET marketplace = CASE 
  WHEN preferred_currency = 'USD' OR country = 'US' THEN 'US'::marketplace_type
  ELSE 'UK'::marketplace_type
END;

-- Update existing listings based on currency
UPDATE listings
SET marketplace = CASE
  WHEN currency = 'USD' THEN 'US'::marketplace_type
  ELSE 'UK'::marketplace_type
END;