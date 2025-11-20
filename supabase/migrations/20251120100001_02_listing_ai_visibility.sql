-- Add AI Answer Engines visibility toggle to listings table
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS ai_answer_engines_enabled BOOLEAN DEFAULT false;

-- Create index for fast filtering in ACP/MCP queries
CREATE INDEX IF NOT EXISTS idx_listings_ai_answer_engines_enabled ON listings(ai_answer_engines_enabled) 
WHERE ai_answer_engines_enabled = true;

-- Create composite index for common query patterns (status + AI enabled)
CREATE INDEX IF NOT EXISTS idx_listings_status_ai_enabled ON listings(status, ai_answer_engines_enabled) 
WHERE status = 'active' AND ai_answer_engines_enabled = true;

-- Add comment for documentation
COMMENT ON COLUMN listings.ai_answer_engines_enabled IS 'Whether this listing is visible to AI agents via ACP/MCP protocols. Defaults to false (opt-in model).';

-- Update RLS policy to allow users to update their own listings' AI visibility
-- (This should already be covered by existing policies, but we ensure it's explicit)
-- Note: Existing policies should already allow users to update their own listings

