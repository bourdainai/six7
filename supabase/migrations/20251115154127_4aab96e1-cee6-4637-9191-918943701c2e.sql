-- Phase 6: Enhanced Moderation System

-- Add AI moderation columns to reports table
ALTER TABLE reports ADD COLUMN ai_summary TEXT;
ALTER TABLE reports ADD COLUMN ai_risk_score INTEGER;
ALTER TABLE reports ADD COLUMN ai_recommended_action TEXT; -- 'dismiss', 'warn', 'suspend', 'ban'

-- Add AI moderation columns to disputes table
ALTER TABLE disputes ADD COLUMN ai_summary TEXT;
ALTER TABLE disputes ADD COLUMN ai_recommended_outcome TEXT; -- 'buyer_favor', 'seller_favor', 'partial_refund', 'full_refund'
ALTER TABLE disputes ADD COLUMN ai_confidence_score INTEGER; -- 0-100

-- Create moderation queue table for tracking AI decisions
CREATE TABLE moderation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type TEXT NOT NULL, -- 'report', 'dispute', 'listing'
  item_id UUID NOT NULL,
  ai_classification TEXT, -- 'low_priority', 'medium_priority', 'high_priority', 'critical'
  ai_reason TEXT,
  assigned_to UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'resolved', 'escalated'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on moderation_queue
ALTER TABLE moderation_queue ENABLE ROW LEVEL SECURITY;

-- Moderators and admins can view moderation queue
CREATE POLICY "Moderators can view moderation queue"
  ON moderation_queue
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('moderator', 'admin')
    )
  );

-- Moderators can update queue items
CREATE POLICY "Moderators can update queue items"
  ON moderation_queue
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('moderator', 'admin')
    )
  );

-- System can insert into moderation queue
CREATE POLICY "System can insert into moderation queue"
  ON moderation_queue
  FOR INSERT
  WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_moderation_queue_status ON moderation_queue(status);
CREATE INDEX idx_moderation_queue_classification ON moderation_queue(ai_classification);
CREATE INDEX idx_moderation_queue_created_at ON moderation_queue(created_at DESC);
CREATE INDEX idx_reports_ai_risk_score ON reports(ai_risk_score DESC);
CREATE INDEX idx_disputes_ai_confidence ON disputes(ai_confidence_score DESC);