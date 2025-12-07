-- Fix function search path mutable warning
-- The update_sendcloud_parcel_timestamp function is missing SET search_path

CREATE OR REPLACE FUNCTION public.update_sendcloud_parcel_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;