-- Create membership tiers enum
CREATE TYPE membership_tier AS ENUM ('free', 'pro', 'enterprise');

-- Create risk tier enum
CREATE TYPE risk_tier AS ENUM ('A', 'B', 'C');

-- Create user memberships table
CREATE TABLE user_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tier membership_tier NOT NULL DEFAULT 'free',
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  promo_user BOOLEAN DEFAULT false,
  promo_expiry TIMESTAMP WITH TIME ZONE,
  monthly_gmv_counter NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Create seller risk ratings table
CREATE TABLE seller_risk_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  risk_tier risk_tier NOT NULL DEFAULT 'A',
  cancellation_rate NUMERIC DEFAULT 0,
  avg_shipping_days INTEGER DEFAULT 0,
  dispute_ratio NUMERIC DEFAULT 0,
  rating_average NUMERIC DEFAULT 5.0,
  volume_last_30_days INTEGER DEFAULT 0,
  last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(seller_id)
);

-- Create transaction fees table for detailed breakdown
CREATE TABLE transaction_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  buyer_protection_fee NUMERIC NOT NULL DEFAULT 0,
  seller_commission_fee NUMERIC NOT NULL DEFAULT 0,
  seller_commission_percentage NUMERIC NOT NULL DEFAULT 0,
  instant_payout_fee NUMERIC NOT NULL DEFAULT 0,
  instant_payout_percentage NUMERIC NOT NULL DEFAULT 0,
  shipping_margin NUMERIC DEFAULT 0,
  protection_addon_fee NUMERIC DEFAULT 0,
  buyer_tier membership_tier NOT NULL,
  seller_tier membership_tier NOT NULL,
  seller_risk_tier risk_tier NOT NULL,
  buyer_gmv_at_purchase NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(order_id)
);

-- Enable RLS
ALTER TABLE user_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_risk_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_fees ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_memberships
CREATE POLICY "Users can view own membership"
  ON user_memberships FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own membership"
  ON user_memberships FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for seller_risk_ratings
CREATE POLICY "Everyone can view seller risk ratings"
  ON seller_risk_ratings FOR SELECT
  USING (true);

CREATE POLICY "System can manage seller risk ratings"
  ON seller_risk_ratings FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies for transaction_fees
CREATE POLICY "Users can view fees for their orders"
  ON transaction_fees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = transaction_fees.order_id
      AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
    )
  );

CREATE POLICY "System can insert transaction fees"
  ON transaction_fees FOR INSERT
  WITH CHECK (true);

-- Create function to update membership updated_at
CREATE OR REPLACE FUNCTION update_membership_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for membership updates
CREATE TRIGGER update_membership_updated_at
  BEFORE UPDATE ON user_memberships
  FOR EACH ROW
  EXECUTE FUNCTION update_membership_timestamp();

-- Create function to initialize membership for new users
CREATE OR REPLACE FUNCTION initialize_user_membership()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_memberships (user_id, tier)
  VALUES (NEW.id, 'free');
  
  INSERT INTO seller_risk_ratings (seller_id, risk_tier)
  VALUES (NEW.id, 'A');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to initialize membership on user creation
CREATE TRIGGER on_user_created_init_membership
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_membership();