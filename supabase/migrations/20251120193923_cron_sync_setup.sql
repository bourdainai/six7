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

-- Note: To set up the cron job, use one of these methods:
-- 
-- Method 1: Supabase Dashboard
-- 1. Go to Database > Cron Jobs
-- 2. Create new cron job with schedule: "0 2 * * *" (daily at 2 AM)
-- 3. Function: sync-tcg-data
-- 4. Payload: {"autoSelectSet": true}
-- 5. Headers: {"Authorization": "Bearer <cron-secret>"}
--
-- Method 2: pg_cron extension (if enabled)
-- SELECT cron.schedule(
--   'sync-pokemon-cards',
--   '0 2 * * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://<project-ref>.supabase.co/functions/v1/sync-tcg-data',
--     headers := '{"Authorization": "Bearer <cron-secret>", "Content-Type": "application/json"}'::jsonb,
--     body := '{"autoSelectSet": true}'::jsonb
--   );
--   $$
-- );

