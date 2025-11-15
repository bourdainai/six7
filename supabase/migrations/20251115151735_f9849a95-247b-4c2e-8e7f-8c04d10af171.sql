-- Create seller automation rules table
CREATE TABLE seller_automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('auto_relist', 'auto_discount', 'auto_bundle', 'price_drop')),
  conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  actions JSONB NOT NULL DEFAULT '{}'::jsonb,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add stale inventory tracking to listings
ALTER TABLE listings ADD COLUMN IF NOT EXISTS last_view_at TIMESTAMPTZ;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS stale_risk_score INTEGER DEFAULT 0 CHECK (stale_risk_score >= 0 AND stale_risk_score <= 100);

-- Enable RLS
ALTER TABLE seller_automation_rules ENABLE ROW LEVEL SECURITY;

-- RLS policies for seller_automation_rules
CREATE POLICY "Sellers can view their own automation rules"
  ON seller_automation_rules FOR SELECT
  USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can insert their own automation rules"
  ON seller_automation_rules FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their own automation rules"
  ON seller_automation_rules FOR UPDATE
  USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete their own automation rules"
  ON seller_automation_rules FOR DELETE
  USING (auth.uid() = seller_id);

-- Create indexes
CREATE INDEX idx_seller_automation_rules_seller_id ON seller_automation_rules(seller_id);
CREATE INDEX idx_seller_automation_rules_enabled ON seller_automation_rules(enabled) WHERE enabled = TRUE;
CREATE INDEX idx_listings_stale_risk ON listings(stale_risk_score DESC) WHERE status = 'active';
CREATE INDEX idx_listings_last_view ON listings(last_view_at) WHERE status = 'active';