-- Create user activity logs table for admin tracking
CREATE TABLE IF NOT EXISTS public.user_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  ip_address INET,
  city TEXT,
  country TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_user_activity_logs_user_id ON public.user_activity_logs(user_id);
CREATE INDEX idx_user_activity_logs_created_at ON public.user_activity_logs(created_at DESC);
CREATE INDEX idx_user_activity_logs_activity_type ON public.user_activity_logs(activity_type);

-- Enable RLS
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view activity logs
CREATE POLICY "Admins can view all activity logs"
  ON public.user_activity_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Create materialized view for admin live stats
CREATE MATERIALIZED VIEW IF NOT EXISTS public.admin_live_stats AS
SELECT
  (SELECT COUNT(*) FROM profiles) as total_users,
  (SELECT COUNT(*) FROM profiles WHERE created_at >= now() - interval '24 hours') as new_users_24h,
  (SELECT COUNT(*) FROM profiles WHERE created_at >= now() - interval '7 days') as new_users_7d,
  (SELECT COUNT(*) FROM listings WHERE status = 'active') as active_listings,
  (SELECT COUNT(*) FROM orders WHERE status = 'completed') as completed_orders,
  (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status = 'completed') as total_revenue,
  (SELECT COALESCE(SUM(platform_fee), 0) FROM orders WHERE status = 'completed') as total_platform_fees,
  (SELECT COUNT(*) FROM messages WHERE created_at >= now() - interval '24 hours') as messages_24h,
  (SELECT COUNT(*) FROM offers WHERE created_at >= now() - interval '24 hours') as offers_24h,
  (SELECT COUNT(*) FROM disputes WHERE status = 'open') as open_disputes,
  now() as last_updated;

-- Create function to refresh stats
CREATE OR REPLACE FUNCTION refresh_admin_live_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW admin_live_stats;
END;
$$;

-- Add moderator role capability
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role' AND 'moderator' = ANY(enum_range(NULL::user_role)::text[])) THEN
    ALTER TYPE user_role ADD VALUE 'moderator';
  END IF;
END $$;

-- Create table for tracking dispute assignments
CREATE TABLE IF NOT EXISTS public.dispute_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID REFERENCES public.disputes(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES public.profiles(id),
  assigned_by UUID REFERENCES public.profiles(id),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  notes TEXT,
  UNIQUE(dispute_id)
);

-- Enable RLS for dispute assignments
ALTER TABLE public.dispute_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and moderators can view assignments"
  ON public.dispute_assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins can manage assignments"
  ON public.dispute_assignments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );