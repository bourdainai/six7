
-- Create function to increment buyer GMV counter
CREATE OR REPLACE FUNCTION public.increment_gmv(
  p_user_id uuid,
  p_amount numeric
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE user_memberships
  SET monthly_gmv_counter = monthly_gmv_counter + p_amount
  WHERE user_id = p_user_id;
END;
$$;
