-- Fix security issue: Set search_path for refresh_trade_opportunities function
CREATE OR REPLACE FUNCTION refresh_trade_opportunities()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY trade_opportunities;
END;
$$;