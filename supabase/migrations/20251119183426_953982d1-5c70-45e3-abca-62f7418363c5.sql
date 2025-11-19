-- Fix Critical RLS Policy Vulnerabilities
-- Drop ALL existing policies and recreate with proper restrictions

-- 1. Fix pokemon_card_attributes
DROP POLICY IF EXISTS "System can manage pokemon cards" ON pokemon_card_attributes;
DROP POLICY IF EXISTS "Pokemon cards viewable by everyone" ON pokemon_card_attributes;
DROP POLICY IF EXISTS "Anyone can view pokemon cards" ON pokemon_card_attributes;

CREATE POLICY "Anyone can view pokemon cards"
ON pokemon_card_attributes FOR SELECT
TO authenticated, anon
USING (true);

-- 2. Fix seller_analytics
DROP POLICY IF EXISTS "System can manage seller analytics" ON seller_analytics;
DROP POLICY IF EXISTS "Sellers can view their own analytics" ON seller_analytics;

CREATE POLICY "Sellers can view their own analytics"
ON seller_analytics FOR SELECT
TO authenticated
USING (auth.uid() = seller_id);

-- 3. Fix seller_verifications
DROP POLICY IF EXISTS "System can manage verifications" ON seller_verifications;
DROP POLICY IF EXISTS "Sellers can view their own verifications" ON seller_verifications;

CREATE POLICY "Sellers can view their own verifications"
ON seller_verifications FOR SELECT
TO authenticated
USING (auth.uid() = seller_id);

-- 4. Fix seller_risk_ratings
DROP POLICY IF EXISTS "System can manage seller risk ratings" ON seller_risk_ratings;
DROP POLICY IF EXISTS "Everyone can view seller risk ratings" ON seller_risk_ratings;

CREATE POLICY "Everyone can view seller risk ratings"
ON seller_risk_ratings FOR SELECT
TO authenticated, anon
USING (true);

-- All writes to these tables now require SERVICE_ROLE_KEY (via edge functions only)