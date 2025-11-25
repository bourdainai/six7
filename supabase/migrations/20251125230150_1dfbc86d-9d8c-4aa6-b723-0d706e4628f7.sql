-- Fix mutable search_path on database functions
-- Add SET search_path to functions missing it for security

-- Functions that need search_path set
ALTER FUNCTION public.accept_trade_offer(uuid, numeric) 
  SET search_path TO 'public', 'pg_temp';

ALTER FUNCTION public.get_next_set_to_sync() 
  SET search_path TO 'public', 'pg_temp';

ALTER FUNCTION public.increment_gmv(uuid, numeric) 
  SET search_path TO 'public', 'pg_temp';

ALTER FUNCTION public.increment_card_popularity(varchar[]) 
  SET search_path TO 'public', 'pg_temp';

ALTER FUNCTION public.is_admin() 
  SET search_path TO 'public', 'pg_temp';

ALTER FUNCTION public.get_top_sellers(integer) 
  SET search_path TO 'public', 'pg_temp';

ALTER FUNCTION public.get_top_buyers(integer) 
  SET search_path TO 'public', 'pg_temp';

ALTER FUNCTION public.refresh_trade_opportunities() 
  SET search_path TO 'public', 'pg_temp';

ALTER FUNCTION public.refresh_listing_facets() 
  SET search_path TO 'public', 'pg_temp';

ALTER FUNCTION public.refresh_admin_live_stats() 
  SET search_path TO 'public', 'pg_temp';

ALTER FUNCTION public.cleanup_expired_variant_reservations() 
  SET search_path TO 'public', 'pg_temp';

ALTER FUNCTION public.ensure_admin_role() 
  SET search_path TO 'public', 'pg_temp';

ALTER FUNCTION public.sync_email_verification() 
  SET search_path TO 'public', 'pg_temp';