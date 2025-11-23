-- Create import_jobs table for tracking Collectr imports
CREATE TABLE IF NOT EXISTS import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('csv', 'portfolio_url')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  total_items INTEGER NOT NULL DEFAULT 0,
  processed_items INTEGER NOT NULL DEFAULT 0,
  failed_items INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_message TEXT
);

-- Add import tracking columns to listings table
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS portfolio_name TEXT,
ADD COLUMN IF NOT EXISTS import_job_id UUID REFERENCES import_jobs(id),
ADD COLUMN IF NOT EXISTS import_metadata JSONB DEFAULT '{}'::jsonb;

-- Create index for faster import job lookups
CREATE INDEX IF NOT EXISTS idx_import_jobs_user_id ON import_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_import_jobs_status ON import_jobs(status);
CREATE INDEX IF NOT EXISTS idx_listings_import_job_id ON listings(import_job_id);

-- Enable RLS on import_jobs
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;

-- Users can view their own import jobs
CREATE POLICY "Users can view own import jobs"
  ON import_jobs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own import jobs
CREATE POLICY "Users can create own import jobs"
  ON import_jobs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own import jobs
CREATE POLICY "Users can update own import jobs"
  ON import_jobs
  FOR UPDATE
  USING (auth.uid() = user_id);