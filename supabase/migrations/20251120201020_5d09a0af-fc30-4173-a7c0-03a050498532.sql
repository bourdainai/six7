-- Phase 6: Documentation and setup instructions for cron job
-- Note: Actual cron job setup is done via Supabase Dashboard or pg_cron extension

-- Create a helper function to get next set to sync (for cron jobs)
CREATE OR REPLACE FUNCTION get_next_set_to_sync()
RETURNS TABLE (
  set_code VARCHAR(50),
  set_name VARCHAR(255),
  priority_tier INTEGER,
  last_page_synced INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sp.set_code,
    sp.set_name,
    sp.priority_tier,
    sp.last_page_synced
  FROM tcg_sync_progress sp
  WHERE sp.sync_status IN ('pending', 'in_progress')
  ORDER BY sp.priority_tier ASC, sp.last_sync_at ASC NULLS FIRST
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION get_next_set_to_sync() IS 'Helper function for cron jobs to identify the next set to sync based on priority';