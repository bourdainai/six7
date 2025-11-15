-- Create seller reputation metrics table
CREATE TABLE public.seller_reputation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reputation_score INTEGER NOT NULL DEFAULT 0,
  verification_level TEXT NOT NULL DEFAULT 'unverified',
  total_sales INTEGER NOT NULL DEFAULT 0,
  total_revenue NUMERIC NOT NULL DEFAULT 0,
  average_rating NUMERIC NOT NULL DEFAULT 0,
  total_reviews INTEGER NOT NULL DEFAULT 0,
  response_rate NUMERIC NOT NULL DEFAULT 0,
  avg_response_time_hours INTEGER NOT NULL DEFAULT 0,
  disputes_won INTEGER NOT NULL DEFAULT 0,
  disputes_lost INTEGER NOT NULL DEFAULT 0,
  on_time_shipments INTEGER NOT NULL DEFAULT 0,
  late_shipments INTEGER NOT NULL DEFAULT 0,
  cancellation_rate NUMERIC NOT NULL DEFAULT 0,
  active_since TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(seller_id)
);

-- Create seller badges table
CREATE TABLE public.seller_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create reputation events table for tracking changes
CREATE TABLE public.reputation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  impact_score INTEGER NOT NULL,
  reasoning TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.seller_reputation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reputation_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for seller_reputation
CREATE POLICY "Everyone can view seller reputation"
  ON public.seller_reputation
  FOR SELECT
  USING (true);

CREATE POLICY "System can update seller reputation"
  ON public.seller_reputation
  FOR UPDATE
  USING (true);

CREATE POLICY "System can insert seller reputation"
  ON public.seller_reputation
  FOR INSERT
  WITH CHECK (true);

-- RLS Policies for seller_badges
CREATE POLICY "Everyone can view seller badges"
  ON public.seller_badges
  FOR SELECT
  USING (true);

CREATE POLICY "System can insert seller badges"
  ON public.seller_badges
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Sellers can delete their own badges"
  ON public.seller_badges
  FOR DELETE
  USING (auth.uid() = seller_id);

-- RLS Policies for reputation_events
CREATE POLICY "Sellers can view their reputation events"
  ON public.reputation_events
  FOR SELECT
  USING (auth.uid() = seller_id);

CREATE POLICY "System can insert reputation events"
  ON public.reputation_events
  FOR INSERT
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_seller_reputation_seller ON seller_reputation(seller_id);
CREATE INDEX idx_seller_reputation_score ON seller_reputation(reputation_score DESC);
CREATE INDEX idx_seller_reputation_level ON seller_reputation(verification_level);
CREATE INDEX idx_seller_badges_seller ON seller_badges(seller_id);
CREATE INDEX idx_reputation_events_seller ON reputation_events(seller_id, created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_seller_reputation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for timestamp updates
CREATE TRIGGER update_seller_reputation_updated_at
  BEFORE UPDATE ON seller_reputation
  FOR EACH ROW
  EXECUTE FUNCTION update_seller_reputation_timestamp();