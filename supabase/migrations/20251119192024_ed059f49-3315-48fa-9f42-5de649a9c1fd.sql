-- Fix Critical System Tables RLS Vulnerabilities
-- Drop overly permissive INSERT policies that allow any authenticated user to write to system tables

-- 1. Fix fraud_flags - only edge functions should create fraud flags
DROP POLICY IF EXISTS "System can insert fraud flags" ON fraud_flags;

-- 2. Fix seller_badges - only edge functions should award badges
DROP POLICY IF EXISTS "System can insert seller badges" ON seller_badges;

-- 3. Fix moderation_queue - only edge functions should add to moderation queue
DROP POLICY IF EXISTS "System can insert into moderation queue" ON moderation_queue;

-- 4. Fix reputation_events - only edge functions should create reputation events
DROP POLICY IF EXISTS "System can insert reputation events" ON reputation_events;

-- 5. Fix trust_score_events - only edge functions should create trust events
DROP POLICY IF EXISTS "System can insert trust events" ON trust_score_events;

-- 6. Fix transaction_fees - only edge functions should create fee records
DROP POLICY IF EXISTS "System can insert transaction fees" ON transaction_fees;

-- All writes to these tables now require SERVICE_ROLE_KEY (via edge functions only)
-- Read policies remain unchanged so users can view their relevant data