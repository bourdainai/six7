
-- Add 'justtcg' to the sync_source_type enum
ALTER TYPE sync_source_type ADD VALUE IF NOT EXISTS 'justtcg';

-- Add sync_source column to tcg_sync_progress table
ALTER TABLE tcg_sync_progress 
ADD COLUMN IF NOT EXISTS sync_source sync_source_type DEFAULT 'cron';

-- Update the unique constraint to include sync_source (allows same set from different sources)
ALTER TABLE tcg_sync_progress
DROP CONSTRAINT IF EXISTS tcg_sync_progress_set_code_key;

ALTER TABLE tcg_sync_progress
ADD CONSTRAINT tcg_sync_progress_set_code_source_key UNIQUE (set_code, sync_source);
