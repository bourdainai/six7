-- Create buyer agent activity log
CREATE TABLE buyer_agent_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('new_match', 'price_drop', 'bundle_suggestion', 'recommendation')),
  listing_ids JSONB NOT NULL,
  fit_score NUMERIC CHECK (fit_score >= 0 AND fit_score <= 100),
  reasoning TEXT,
  notified_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  actioned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create agent learning events
CREATE TABLE buyer_agent_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('liked', 'saved', 'hidden', 'purchased', 'skipped', 'clicked')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE buyer_agent_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_agent_feedback ENABLE ROW LEVEL SECURITY;

-- RLS policies for buyer_agent_activities
CREATE POLICY "Users can view their own agent activities"
  ON buyer_agent_activities FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert agent activities"
  ON buyer_agent_activities FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own agent activities"
  ON buyer_agent_activities FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS policies for buyer_agent_feedback
CREATE POLICY "Users can view their own feedback"
  ON buyer_agent_feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feedback"
  ON buyer_agent_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_buyer_agent_activities_user_id ON buyer_agent_activities(user_id);
CREATE INDEX idx_buyer_agent_activities_created_at ON buyer_agent_activities(created_at DESC);
CREATE INDEX idx_buyer_agent_feedback_user_id ON buyer_agent_feedback(user_id);
CREATE INDEX idx_buyer_agent_feedback_listing_id ON buyer_agent_feedback(listing_id);
CREATE INDEX idx_buyer_agent_feedback_created_at ON buyer_agent_feedback(created_at DESC);