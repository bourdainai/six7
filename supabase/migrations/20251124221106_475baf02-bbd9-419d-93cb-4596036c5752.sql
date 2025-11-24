-- Phase 3: Enhanced Reviews System
-- Add multi-dimensional ratings and enhanced features to existing ratings table

-- Add new columns to ratings table for enhanced features
ALTER TABLE public.ratings 
ADD COLUMN IF NOT EXISTS communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
ADD COLUMN IF NOT EXISTS packaging_rating INTEGER CHECK (packaging_rating >= 1 AND packaging_rating <= 5),
ADD COLUMN IF NOT EXISTS speed_rating INTEGER CHECK (speed_rating >= 1 AND speed_rating <= 5),
ADD COLUMN IF NOT EXISTS ai_moderation_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS ai_moderation_reason TEXT,
ADD COLUMN IF NOT EXISTS ai_sentiment_score NUMERIC(3,2);

-- Create review notification preferences
CREATE TABLE IF NOT EXISTS public.review_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notify_new_review BOOLEAN DEFAULT true,
  notify_seller_response BOOLEAN DEFAULT true,
  notify_helpful_vote BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on review preferences
ALTER TABLE public.review_notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for review notification preferences
CREATE POLICY "Users can view own review preferences"
  ON public.review_notification_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own review preferences"
  ON public.review_notification_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own review preferences"
  ON public.review_notification_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create function to auto-insert default preferences on user creation
CREATE OR REPLACE FUNCTION public.create_default_review_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.review_notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created_review_prefs ON auth.users;
CREATE TRIGGER on_auth_user_created_review_prefs
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_review_preferences();

-- Update timestamp trigger for preferences
CREATE OR REPLACE FUNCTION public.update_review_prefs_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_review_prefs_timestamp
  BEFORE UPDATE ON public.review_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_review_prefs_updated_at();

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ratings_reviewee_created ON public.ratings(reviewee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ratings_ai_moderation ON public.ratings(ai_moderation_status) WHERE ai_moderation_status = 'pending';

-- Update existing ratings to have default values
UPDATE public.ratings 
SET ai_moderation_status = 'approved'
WHERE ai_moderation_status IS NULL;