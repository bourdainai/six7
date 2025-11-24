-- Phase 3: Enhanced Reviews System
-- Add enhanced review features to ratings table and create review_votes table

-- Add new columns to ratings table for enhanced features
ALTER TABLE ratings
ADD COLUMN IF NOT EXISTS seller_response TEXT,
ADD COLUMN IF NOT EXISTS seller_response_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS helpful_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS review_images JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS verified_purchase BOOLEAN DEFAULT false;

-- Create review_votes table to track who found reviews helpful
CREATE TABLE IF NOT EXISTS review_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES ratings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(review_id, user_id)
);

-- Enable RLS on review_votes
ALTER TABLE review_votes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view votes
CREATE POLICY "Anyone can view review votes"
  ON review_votes FOR SELECT
  TO public
  USING (true);

-- Allow authenticated users to vote
CREATE POLICY "Users can add their vote"
  ON review_votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow users to remove their vote
CREATE POLICY "Users can remove their vote"
  ON review_votes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create function to update helpful_count when votes change
CREATE OR REPLACE FUNCTION update_review_helpful_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE ratings 
    SET helpful_count = COALESCE(helpful_count, 0) + 1
    WHERE id = NEW.review_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE ratings 
    SET helpful_count = GREATEST(COALESCE(helpful_count, 0) - 1, 0)
    WHERE id = OLD.review_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Create triggers for vote count updates
DROP TRIGGER IF EXISTS update_helpful_count_on_insert ON review_votes;
CREATE TRIGGER update_helpful_count_on_insert
  AFTER INSERT ON review_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_review_helpful_count();

DROP TRIGGER IF EXISTS update_helpful_count_on_delete ON review_votes;
CREATE TRIGGER update_helpful_count_on_delete
  AFTER DELETE ON review_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_review_helpful_count();

-- Update existing ratings to set verified_purchase based on actual orders
UPDATE ratings r
SET verified_purchase = true
WHERE EXISTS (
  SELECT 1 FROM orders o
  WHERE o.id = r.order_id
  AND o.status IN ('delivered', 'completed')
);