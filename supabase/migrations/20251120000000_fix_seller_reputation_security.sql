-- Fix seller_reputation table RLS policies
-- Remove overly permissive INSERT and UPDATE policies that allow any authenticated user to modify reputation data
-- Only edge functions with SERVICE_ROLE_KEY should be able to write to this table

DROP POLICY IF EXISTS "System can insert seller reputation" ON seller_reputation;
DROP POLICY IF EXISTS "System can update seller reputation" ON seller_reputation;

-- The SELECT policy "Everyone can view seller reputation" remains intact
-- No write policies = only SERVICE_ROLE_KEY via edge functions can modify reputation data

