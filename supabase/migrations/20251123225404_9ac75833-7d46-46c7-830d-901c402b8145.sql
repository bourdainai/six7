-- Phase 4: Analytics & Insights Tables

-- Market trends tracking
CREATE TABLE IF NOT EXISTS public.trade_market_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id VARCHAR REFERENCES pokemon_card_attributes(card_id),
  date DATE NOT NULL,
  avg_trade_value DECIMAL(10,2),
  trade_volume INTEGER DEFAULT 0,
  price_trend VARCHAR(20), -- 'rising', 'falling', 'stable'
  popularity_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Trade recommendations
CREATE TABLE IF NOT EXISTS public.trade_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  recommended_offer JSONB NOT NULL,
  confidence_score DECIMAL(5,2), -- 0-100
  reasoning TEXT,
  potential_value_gain DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'expired'
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Portfolio analytics snapshots
CREATE TABLE IF NOT EXISTS public.portfolio_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  total_value DECIMAL(10,2),
  total_items INTEGER,
  top_cards JSONB,
  portfolio_health_score DECIMAL(5,2),
  diversification_score DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Trade analytics summary
CREATE TABLE IF NOT EXISTS public.trade_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  period VARCHAR(20) NOT NULL, -- 'week', 'month', 'year', 'all_time'
  total_trades INTEGER DEFAULT 0,
  successful_trades INTEGER DEFAULT 0,
  avg_trade_value DECIMAL(10,2),
  total_value_gained DECIMAL(10,2),
  best_trade_id UUID REFERENCES trade_offers(id),
  avg_negotiation_rounds DECIMAL(5,2),
  avg_response_time_hours DECIMAL(8,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, period)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_market_trends_card_date ON trade_market_trends(card_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_user_status ON trade_recommendations(user_id, status, expires_at);
CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_user_date ON portfolio_snapshots(user_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_trade_analytics_user_period ON trade_analytics(user_id, period);

-- RLS Policies
ALTER TABLE public.trade_market_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_analytics ENABLE ROW LEVEL SECURITY;

-- Market trends are public (read-only)
CREATE POLICY "Market trends are viewable by everyone"
  ON trade_market_trends FOR SELECT
  USING (true);

-- Users can view their own recommendations
CREATE POLICY "Users can view their own recommendations"
  ON trade_recommendations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own recommendations"
  ON trade_recommendations FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can view their own portfolio snapshots
CREATE POLICY "Users can view their own portfolio snapshots"
  ON portfolio_snapshots FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view their own analytics
CREATE POLICY "Users can view their own analytics"
  ON trade_analytics FOR SELECT
  USING (auth.uid() = user_id);