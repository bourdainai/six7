-- Phase 4: Create Sync Progress Tracking
-- Track sync state per set to enable incremental syncing

-- Create tcg_sync_progress table
CREATE TABLE IF NOT EXISTS tcg_sync_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  set_code VARCHAR(50) UNIQUE NOT NULL,
  set_name VARCHAR(255),
  last_page_synced INTEGER DEFAULT 0,
  total_cards INTEGER,
  synced_cards INTEGER DEFAULT 0,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_status VARCHAR(20) DEFAULT 'pending' CHECK (sync_status IN ('pending', 'in_progress', 'completed', 'failed')),
  priority_tier INTEGER DEFAULT 4 CHECK (priority_tier >= 1 AND priority_tier <= 4),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for sync progress queries
CREATE INDEX IF NOT EXISTS idx_tcg_sync_progress_status 
  ON tcg_sync_progress(sync_status);

CREATE INDEX IF NOT EXISTS idx_tcg_sync_progress_priority 
  ON tcg_sync_progress(priority_tier, sync_status);

CREATE INDEX IF NOT EXISTS idx_tcg_sync_progress_last_sync 
  ON tcg_sync_progress(last_sync_at DESC NULLS LAST);

-- Create popular_sets table for priority set management
CREATE TABLE IF NOT EXISTS popular_sets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  set_code VARCHAR(50) UNIQUE NOT NULL,
  set_name VARCHAR(255) NOT NULL,
  priority_tier INTEGER DEFAULT 4 CHECK (priority_tier >= 1 AND priority_tier <= 4),
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on popular_sets
CREATE INDEX IF NOT EXISTS idx_popular_sets_priority 
  ON popular_sets(priority_tier, is_active);

-- Pre-populate with known popular sets (Tier 1: Most popular vintage sets)
INSERT INTO popular_sets (set_code, set_name, priority_tier) VALUES
  ('base1', 'Base Set', 1),
  ('base2', 'Base Set 2', 1),
  ('jungle', 'Jungle', 1),
  ('fossil', 'Fossil', 1),
  ('team-rocket', 'Team Rocket', 1),
  ('gym-heroes', 'Gym Heroes', 2),
  ('gym-challenge', 'Gym Challenge', 2),
  ('neo-genesis', 'Neo Genesis', 2),
  ('neo-discovery', 'Neo Discovery', 2),
  ('neo-revelation', 'Neo Revelation', 2),
  ('neo-destiny', 'Neo Destiny', 2)
ON CONFLICT (set_code) DO UPDATE SET
  priority_tier = EXCLUDED.priority_tier,
  updated_at = NOW();

-- Enable Row Level Security
ALTER TABLE tcg_sync_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE popular_sets ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Readable by everyone, writable only by service role
CREATE POLICY "Sync progress is viewable by everyone" 
  ON tcg_sync_progress FOR SELECT 
  USING (true);

CREATE POLICY "Popular sets are viewable by everyone" 
  ON popular_sets FOR SELECT 
  USING (true);

-- Add comments for documentation
COMMENT ON TABLE tcg_sync_progress IS 'Tracks incremental sync progress for each Pokemon TCG set';
COMMENT ON COLUMN tcg_sync_progress.priority_tier IS '1=Most popular (Base Set, etc.), 2=Recent sets, 3=High search volume, 4=All others';
COMMENT ON TABLE popular_sets IS 'Pre-configured list of popular sets with priority tiers for sync scheduling';

