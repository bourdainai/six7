-- Enterprise Import Job Tracking System
-- Provides full visibility into data imports with field-level tracking

-- Import Jobs Table - Tracks high-level import job status
CREATE TABLE IF NOT EXISTS import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type VARCHAR(50) NOT NULL, -- 'set_import', 'bulk_import', 'single_set'
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'running', 'paused', 'completed', 'failed', 'cancelled'
  
  -- Progress tracking
  sets_total INTEGER DEFAULT 0,
  sets_completed INTEGER DEFAULT 0,
  sets_failed INTEGER DEFAULT 0,
  cards_total INTEGER DEFAULT 0,
  cards_imported INTEGER DEFAULT 0,
  cards_updated INTEGER DEFAULT 0,
  cards_skipped INTEGER DEFAULT 0,
  cards_failed INTEGER DEFAULT 0,
  
  -- Current processing state
  current_set_id VARCHAR(100),
  current_set_name VARCHAR(255),
  current_card_id VARCHAR(255),
  current_card_name VARCHAR(255),
  
  -- Data field completion tracking
  fields_summary JSONB DEFAULT '{
    "core": {"total": 0, "complete": 0},
    "images": {"total": 0, "complete": 0},
    "pricing": {"total": 0, "complete": 0},
    "metadata": {"total": 0, "complete": 0},
    "extended": {"total": 0, "complete": 0}
  }'::jsonb,
  
  -- Timing
  started_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  estimated_completion TIMESTAMPTZ,
  avg_cards_per_second DECIMAL(10,2),
  
  -- Error tracking
  errors JSONB DEFAULT '[]'::jsonb,
  warnings JSONB DEFAULT '[]'::jsonb,
  
  -- Additional metadata
  source VARCHAR(100) DEFAULT 'github', -- 'github', 'tcgdex', etc.
  initiated_by VARCHAR(255), -- user or system
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Import Logs Table - Detailed per-card logging
CREATE TABLE IF NOT EXISTS import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES import_jobs(id) ON DELETE CASCADE,
  
  -- Card identification
  set_id VARCHAR(100),
  set_name VARCHAR(255),
  card_id VARCHAR(255),
  card_name VARCHAR(255),
  card_number VARCHAR(50),
  
  -- Action taken
  action VARCHAR(50) NOT NULL, -- 'inserted', 'updated', 'skipped', 'error'
  reason TEXT, -- Why this action was taken
  
  -- Data fields processed
  fields_processed JSONB DEFAULT '{
    "core": false,
    "images": false,
    "pricing": false,
    "metadata": false,
    "extended": false
  }'::jsonb,
  
  -- Field details
  field_details JSONB DEFAULT '{}'::jsonb, -- Detailed info about each field
  
  -- Performance
  duration_ms INTEGER,
  
  -- Timestamp
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Import Set Progress - Per-set detailed tracking
CREATE TABLE IF NOT EXISTS import_set_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES import_jobs(id) ON DELETE CASCADE,
  set_id VARCHAR(100) NOT NULL,
  set_name VARCHAR(255),
  
  -- Progress
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
  cards_total INTEGER DEFAULT 0,
  cards_processed INTEGER DEFAULT 0,
  cards_inserted INTEGER DEFAULT 0,
  cards_updated INTEGER DEFAULT 0,
  cards_skipped INTEGER DEFAULT 0,
  cards_failed INTEGER DEFAULT 0,
  
  -- Field completion for this set
  fields_completion JSONB DEFAULT '{
    "core": {"processed": 0, "complete": 0, "missing": 0},
    "images": {"processed": 0, "complete": 0, "missing": 0},
    "pricing": {"processed": 0, "complete": 0, "missing": 0},
    "metadata": {"processed": 0, "complete": 0, "missing": 0},
    "extended": {"processed": 0, "complete": 0, "missing": 0}
  }'::jsonb,
  
  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  
  -- Errors for this set
  errors JSONB DEFAULT '[]'::jsonb,
  
  UNIQUE(job_id, set_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_import_jobs_status ON import_jobs(status);
CREATE INDEX IF NOT EXISTS idx_import_jobs_started_at ON import_jobs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_jobs_updated_at ON import_jobs(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_import_logs_job_id ON import_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_import_logs_timestamp ON import_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_import_logs_set_id ON import_logs(set_id);
CREATE INDEX IF NOT EXISTS idx_import_logs_action ON import_logs(action);

CREATE INDEX IF NOT EXISTS idx_import_set_progress_job_id ON import_set_progress(job_id);
CREATE INDEX IF NOT EXISTS idx_import_set_progress_set_id ON import_set_progress(set_id);
CREATE INDEX IF NOT EXISTS idx_import_set_progress_status ON import_set_progress(status);

-- Enable RLS
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_set_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow read access, service role for writes
CREATE POLICY "Import jobs are viewable by everyone" ON import_jobs FOR SELECT USING (true);
CREATE POLICY "Import logs are viewable by everyone" ON import_logs FOR SELECT USING (true);
CREATE POLICY "Import set progress viewable by everyone" ON import_set_progress FOR SELECT USING (true);

-- Service role can manage import tables
CREATE POLICY "Service role manages import jobs" ON import_jobs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages import logs" ON import_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages import set progress" ON import_set_progress FOR ALL USING (true) WITH CHECK (true);

-- Function to update job timestamp
CREATE OR REPLACE FUNCTION update_import_job_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamp
DROP TRIGGER IF EXISTS trigger_update_import_job_timestamp ON import_jobs;
CREATE TRIGGER trigger_update_import_job_timestamp
  BEFORE UPDATE ON import_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_import_job_timestamp();

-- Comments for documentation
COMMENT ON TABLE import_jobs IS 'Tracks high-level status of data import jobs with progress and field completion';
COMMENT ON TABLE import_logs IS 'Detailed per-card logging of import actions with field-level tracking';
COMMENT ON TABLE import_set_progress IS 'Per-set detailed progress tracking during imports';
COMMENT ON COLUMN import_jobs.fields_summary IS 'Aggregated field completion: core (name, id), images (URLs), pricing (prices), metadata (abilities, attacks), extended (flavor text, legalities)';

