-- Phase 5: Fraud & Safety System

-- Create trust score events table
CREATE TABLE trust_score_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL, -- 'successful_sale', 'successful_purchase', 'dispute_resolved_favor', 'dispute_resolved_against', 'late_shipping', 'cancelled_order'
  impact_score INTEGER NOT NULL, -- positive or negative impact (-20 to +20)
  reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create fraud flags table
CREATE TABLE fraud_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  listing_id UUID REFERENCES listings(id),
  order_id UUID REFERENCES orders(id),
  flag_type TEXT NOT NULL, -- 'suspicious_listing', 'payment_abuse', 'multi_account', 'stock_photo', 'duplicate_listing', 'price_manipulation', 'off_platform_request', 'counterfeit_risk'
  risk_score INTEGER NOT NULL, -- 0-100
  details JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending', -- 'pending', 'reviewed', 'confirmed', 'dismissed'
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on trust_score_events
ALTER TABLE trust_score_events ENABLE ROW LEVEL SECURITY;

-- Users can view their own trust score events
CREATE POLICY "Users can view own trust events"
  ON trust_score_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- System can insert trust score events
CREATE POLICY "System can insert trust events"
  ON trust_score_events
  FOR INSERT
  WITH CHECK (true);

-- Enable RLS on fraud_flags
ALTER TABLE fraud_flags ENABLE ROW LEVEL SECURITY;

-- Only admins can view fraud flags
CREATE POLICY "Admins can view all fraud flags"
  ON fraud_flags
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- System can insert fraud flags
CREATE POLICY "System can insert fraud flags"
  ON fraud_flags
  FOR INSERT
  WITH CHECK (true);

-- Admins can update fraud flags
CREATE POLICY "Admins can update fraud flags"
  ON fraud_flags
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Create indexes for performance
CREATE INDEX idx_trust_score_events_user_id ON trust_score_events(user_id);
CREATE INDEX idx_trust_score_events_created_at ON trust_score_events(created_at DESC);
CREATE INDEX idx_fraud_flags_user_id ON fraud_flags(user_id);
CREATE INDEX idx_fraud_flags_listing_id ON fraud_flags(listing_id);
CREATE INDEX idx_fraud_flags_status ON fraud_flags(status);
CREATE INDEX idx_fraud_flags_created_at ON fraud_flags(created_at DESC);