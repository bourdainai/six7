-- Fix function search path mutable security issue
-- All SECURITY DEFINER functions must have a fixed search_path to prevent malicious search_path manipulation

-- Fix functions that don't have SET search_path already

ALTER FUNCTION public.refresh_listing_facets() SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION public.calculate_remaining_bundle_price(listing_id_param uuid) SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION public.update_bundle_price_on_variant_sale() SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION public.refresh_admin_live_stats() SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION public.initialize_user_membership() SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION public.update_membership_timestamp() SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION public.update_listing_saves_count() SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION public.update_seller_verification_level() SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION public.update_support_ticket_timestamp() SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION public.update_seller_reputation_timestamp() SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION public.get_next_set_to_sync() SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION public.increment_gmv(p_user_id uuid, p_amount numeric) SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION public.sync_email_verification() SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION public.increment_card_popularity(card_ids character varying[]) SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION public.update_pokemon_card_search_vector() SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION public.initialize_seller_credits() SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION public.update_listing_search_vector() SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION public.get_top_sellers(limit_count integer) SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION public.get_top_buyers(limit_count integer) SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION public.is_admin() SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION public.update_review_helpful_count() SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION public.refresh_trade_opportunities() SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION public.create_default_review_preferences() SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION public.update_review_prefs_updated_at() SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION public.handle_new_user() SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION public.ensure_admin_role() SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION public.update_updated_at() SET search_path TO 'public', 'pg_temp';