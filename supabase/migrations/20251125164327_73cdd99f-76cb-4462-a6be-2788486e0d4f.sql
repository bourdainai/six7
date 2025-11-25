-- Fix security warnings from previous migration

-- Drop and recreate function with proper search_path
DROP FUNCTION IF EXISTS refresh_admin_live_stats();

CREATE OR REPLACE FUNCTION refresh_admin_live_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW admin_live_stats;
END;
$$;

-- Add RLS policy to materialized view admin_live_stats to restrict API access
ALTER MATERIALIZED VIEW admin_live_stats OWNER TO postgres;

-- Revoke public access to materialized views
REVOKE ALL ON admin_live_stats FROM PUBLIC;
REVOKE ALL ON admin_live_stats FROM anon;
REVOKE ALL ON admin_live_stats FROM authenticated;

-- Grant access only to service role
GRANT SELECT ON admin_live_stats TO service_role;