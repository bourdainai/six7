-- Fix search_path for security
ALTER FUNCTION accept_trade_offer(UUID, NUMERIC) 
SET search_path = public, pg_temp;