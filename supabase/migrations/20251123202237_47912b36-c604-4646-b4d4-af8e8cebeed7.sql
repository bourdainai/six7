-- Add shipping_cost column to sendcloud_parcels if it doesn't exist
ALTER TABLE public.sendcloud_parcels 
ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(10,2) DEFAULT 0;

-- Add is_return column to identify return labels
ALTER TABLE public.sendcloud_parcels 
ADD COLUMN IF NOT EXISTS is_return BOOLEAN DEFAULT false;

-- Create index for faster analytics queries
CREATE INDEX IF NOT EXISTS idx_shipping_analytics_date 
ON public.sendcloud_parcels(created_at);

CREATE INDEX IF NOT EXISTS idx_shipping_analytics_carrier
ON public.sendcloud_parcels(carrier);

CREATE INDEX IF NOT EXISTS idx_shipping_analytics_status
ON public.sendcloud_parcels(status);

-- Create admin role check function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  );
END;
$$;

-- RLS policies for sendcloud_parcels (admin access)
CREATE POLICY "Admins can view all parcels"
  ON public.sendcloud_parcels
  FOR SELECT
  USING (public.is_admin());