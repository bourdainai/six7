-- Enhanced trade_offers table with enterprise features
ALTER TABLE trade_offers 
ADD COLUMN IF NOT EXISTS trade_type VARCHAR(20) DEFAULT 'simple',
ADD COLUMN IF NOT EXISTS requester_notes TEXT,
ADD COLUMN IF NOT EXISTS ai_suggestions JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS negotiation_round INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS parent_offer_id UUID REFERENCES trade_offers(id);

-- Trade negotiations tracking (counter-offers chain)
CREATE TABLE IF NOT EXISTS trade_negotiations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_offer_id UUID NOT NULL REFERENCES trade_offers(id) ON DELETE CASCADE,
  current_offer_id UUID NOT NULL REFERENCES trade_offers(id) ON DELETE CASCADE,
  iteration INTEGER NOT NULL DEFAULT 1,
  proposer_id UUID NOT NULL REFERENCES profiles(id),
  changes_summary JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trade completion tracking with escrow
CREATE TABLE IF NOT EXISTS trade_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_offer_id UUID NOT NULL REFERENCES trade_offers(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES profiles(id),
  seller_id UUID NOT NULL REFERENCES profiles(id),
  buyer_shipped BOOLEAN DEFAULT FALSE,
  seller_shipped BOOLEAN DEFAULT FALSE,
  buyer_received BOOLEAN DEFAULT FALSE,
  seller_received BOOLEAN DEFAULT FALSE,
  buyer_tracking_number TEXT,
  seller_tracking_number TEXT,
  escrow_amount DECIMAL(10,2),
  escrow_released BOOLEAN DEFAULT FALSE,
  escrow_released_at TIMESTAMP WITH TIME ZONE,
  dispute_opened BOOLEAN DEFAULT FALSE,
  dispute_reason TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trade history for reputation
CREATE TABLE IF NOT EXISTS trade_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_offer_id UUID NOT NULL REFERENCES trade_offers(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  partner_id UUID NOT NULL REFERENCES profiles(id),
  trade_value DECIMAL(10,2) NOT NULL,
  fairness_score DECIMAL(3,2),
  completion_time_hours INTEGER,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trade matching opportunities (materialized view for performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS trade_opportunities AS
SELECT 
  l1.seller_id as user_id,
  l2.seller_id as potential_partner_id,
  COUNT(DISTINCT l1.id) as cards_they_want,
  COUNT(DISTINCT l2.id) as cards_i_want,
  SUM(l1.seller_price) as total_value_they_want,
  SUM(l2.seller_price) as total_value_i_want,
  ARRAY_AGG(DISTINCT l1.category) as categories_match
FROM listings l1
JOIN listings l2 ON l1.seller_id != l2.seller_id
WHERE l1.status = 'active' 
  AND l2.status = 'active'
  AND l1.trade_enabled = true
  AND l2.trade_enabled = true
GROUP BY l1.seller_id, l2.seller_id
HAVING COUNT(DISTINCT l1.id) >= 2 AND COUNT(DISTINCT l2.id) >= 2;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_trade_offers_parent ON trade_offers(parent_offer_id);
CREATE INDEX IF NOT EXISTS idx_trade_offers_type ON trade_offers(trade_type);
CREATE INDEX IF NOT EXISTS idx_trade_negotiations_original ON trade_negotiations(original_offer_id);
CREATE INDEX IF NOT EXISTS idx_trade_completions_trade ON trade_completions(trade_offer_id);
CREATE INDEX IF NOT EXISTS idx_trade_history_user ON trade_history(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_history_created ON trade_history(created_at DESC);

-- Enable RLS on new tables
ALTER TABLE trade_negotiations ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trade_negotiations
CREATE POLICY "Users can view negotiations they're part of"
  ON trade_negotiations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trade_offers
      WHERE trade_offers.id = trade_negotiations.original_offer_id
      AND (trade_offers.buyer_id = auth.uid() OR trade_offers.seller_id = auth.uid())
    )
  );

CREATE POLICY "Users can create negotiations for their trades"
  ON trade_negotiations FOR INSERT
  WITH CHECK (auth.uid() = proposer_id);

-- RLS Policies for trade_completions
CREATE POLICY "Users can view their trade completions"
  ON trade_completions FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Users can update their trade completions"
  ON trade_completions FOR UPDATE
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "System can create trade completions"
  ON trade_completions FOR INSERT
  WITH CHECK (true);

-- RLS Policies for trade_history
CREATE POLICY "Users can view their trade history"
  ON trade_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Public can view aggregated trade stats"
  ON trade_history FOR SELECT
  USING (true);

CREATE POLICY "Users can create trade history entries"
  ON trade_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Enable realtime for trade_offers
ALTER PUBLICATION supabase_realtime ADD TABLE trade_offers;
ALTER PUBLICATION supabase_realtime ADD TABLE trade_negotiations;
ALTER PUBLICATION supabase_realtime ADD TABLE trade_completions;

-- Function to refresh trade opportunities
CREATE OR REPLACE FUNCTION refresh_trade_opportunities()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY trade_opportunities;
END;
$$;