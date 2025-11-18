-- Quick Database Verification Script
-- Run this in Supabase SQL Editor to verify all new tables and columns exist

-- 1. Check if new tables exist
SELECT 
  'Tables Check' as check_type,
  table_name,
  CASE 
    WHEN table_name IN ('seller_badges', 'seller_verifications', 'support_tickets', 'support_ticket_replies') 
    THEN '✓ EXISTS' 
    ELSE '✗ MISSING' 
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('seller_badges', 'seller_verifications', 'support_tickets', 'support_ticket_replies')
ORDER BY table_name;

-- 2. Check if profiles table has new columns
SELECT 
  'Profiles Columns Check' as check_type,
  column_name,
  CASE 
    WHEN column_name IN ('notification_preferences', 'email_verified', 'phone_verified', 'id_verified', 'business_verified', 'verification_level')
    THEN '✓ EXISTS'
    ELSE '✗ MISSING'
  END as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name IN ('notification_preferences', 'email_verified', 'phone_verified', 'id_verified', 'business_verified', 'verification_level')
ORDER BY column_name;

-- 3. Check RLS policies exist
SELECT 
  'RLS Policies Check' as check_type,
  tablename,
  policyname,
  '✓ EXISTS' as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('seller_badges', 'seller_verifications', 'support_tickets', 'support_ticket_replies')
ORDER BY tablename, policyname;

-- 4. Summary
SELECT 
  (SELECT COUNT(*) FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('seller_badges', 'seller_verifications', 'support_tickets', 'support_ticket_replies')) as tables_count,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_schema = 'public' 
   AND table_name = 'profiles'
   AND column_name IN ('notification_preferences', 'email_verified', 'phone_verified', 'id_verified', 'business_verified', 'verification_level')) as columns_count,
  CASE 
    WHEN (SELECT COUNT(*) FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name IN ('seller_badges', 'seller_verifications', 'support_tickets', 'support_ticket_replies')) = 4
     AND (SELECT COUNT(*) FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'profiles'
          AND column_name IN ('notification_preferences', 'email_verified', 'phone_verified', 'id_verified', 'business_verified', 'verification_level')) >= 4
    THEN '✓ All migrations applied successfully!'
    ELSE '✗ Some migrations may be missing. Please check the results above.'
  END as summary;
