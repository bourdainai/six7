-- Phase 5: Selling Credits System Tables
CREATE TABLE IF NOT EXISTS seller_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  balance decimal DEFAULT 0 CHECK (balance >= 0),
  lifetime_earned decimal DEFAULT 0,
  lifetime_used decimal DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  amount decimal NOT NULL,
  type text NOT NULL CHECK (type IN ('earned', 'used', 'promotional', 'expired')),
  description text,
  related_order_id uuid REFERENCES orders(id),
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS promotional_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  promo_code text DEFAULT 'LAUNCH250',
  credits_awarded decimal DEFAULT 200,
  first_listing_id uuid REFERENCES listings(id),
  activated_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Phase 1: Super Admin - User Sessions & Location Tracking
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  ip_address inet,
  country text,
  city text,
  region text,
  latitude decimal,
  longitude decimal,
  user_agent text,
  device_type text,
  browser text,
  login_at timestamp with time zone DEFAULT now(),
  last_activity_at timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true
);

-- Add location tracking to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_ip_address inet;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_country text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_city text;

-- Add social links to profiles for seller profile pages
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS instagram_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS twitter_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS youtube_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tiktok_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avg_response_time_hours integer;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_currency text DEFAULT 'GBP';

-- Materialized view for admin live stats
CREATE MATERIALIZED VIEW IF NOT EXISTS admin_live_stats AS
SELECT
  (SELECT COUNT(*) FROM messages WHERE created_at > NOW() - INTERVAL '24 hours') as messages_24h,
  (SELECT COUNT(*) FROM trade_offers WHERE created_at > NOW() - INTERVAL '24 hours') as trades_24h,
  (SELECT COUNT(*) FROM orders WHERE created_at > NOW() - INTERVAL '24 hours') as orders_24h,
  (SELECT SUM(total_amount) FROM orders WHERE status IN ('paid', 'completed')) as total_gmv,
  (SELECT COUNT(*) FROM profiles WHERE created_at > NOW() - INTERVAL '24 hours') as new_users_24h,
  (SELECT COUNT(*) FROM listings WHERE status = 'active') as active_listings;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_seller_credits_user_id ON seller_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_promotional_signups_user_id ON promotional_signups(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON user_sessions(is_active);

-- RLS Policies for seller_credits
ALTER TABLE seller_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own credits"
  ON seller_credits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage credits"
  ON seller_credits FOR ALL
  USING (true);

-- RLS Policies for credit_transactions
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions"
  ON credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policies for promotional_signups
ALTER TABLE promotional_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own promo"
  ON promotional_signups FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policies for user_sessions
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all sessions"
  ON user_sessions FOR SELECT
  USING (is_admin());

CREATE POLICY "Users can view their own sessions"
  ON user_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- Trigger to update seller_credits timestamp
CREATE OR REPLACE FUNCTION update_seller_credits_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_seller_credits_timestamp
  BEFORE UPDATE ON seller_credits
  FOR EACH ROW
  EXECUTE FUNCTION update_seller_credits_timestamp();

-- Initialize credits for new users
CREATE OR REPLACE FUNCTION initialize_seller_credits()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO seller_credits (user_id, balance, lifetime_earned, lifetime_used)
  VALUES (NEW.id, 0, 0, 0)
  ON CONFLICT DO NOTHING;
  
  -- Check if promo slots available (first 250)
  IF (SELECT COUNT(*) FROM promotional_signups) < 250 THEN
    INSERT INTO promotional_signups (user_id, promo_code, credits_awarded)
    VALUES (NEW.id, 'LAUNCH250', 200)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on profile creation
CREATE TRIGGER initialize_seller_credits_trigger
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION initialize_seller_credits();