-- Fix critical security vulnerability: seller_credits table allows any user to modify credits
-- Drop the overly permissive policy that allows anyone to manage credits
DROP POLICY IF EXISTS "System can manage credits" ON seller_credits;

-- Note: The existing "Users can view their own credits" SELECT policy remains in place
-- Credit modifications will only happen through edge functions using the service role key