# Database Migration Guide for Lovable/Supabase

## Overview

We've created 3 new database migrations that need to be applied to your Supabase database:

1. **20250120000000_add_notification_preferences.sql** - Adds notification preferences column to profiles
2. **20250120000001_enhance_seller_badges_and_verification.sql** - Creates seller badges and verification tables
3. **20250120000002_create_support_tickets.sql** - Creates support tickets system

## How Supabase Works with Lovable

- **Lovable** is your frontend deployment platform
- **Supabase** is your backend database (connected via environment variables)
- Migrations need to be run **directly in Supabase**, not through Lovable
- Lovable automatically uses your Supabase connection via `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

## Step 1: Access Your Supabase Dashboard

1. Go to [https://supabase.com](https://supabase.com)
2. Log in to your account
3. Find your project (project ID: `ouvrgsvrkjxltbcwvuyz` based on config.toml)
4. Click on your project to open the dashboard

## Step 2: Apply Migrations

You have **two options** to apply migrations:

### Option A: Using Supabase SQL Editor (Recommended - Easiest)

1. In Supabase Dashboard, go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Copy and paste the contents of each migration file one at a time:
   - Start with: `20250120000000_add_notification_preferences.sql`
   - Then: `20250120000001_enhance_seller_badges_and_verification.sql`
   - Finally: `20250120000002_create_support_tickets.sql`
4. Click **Run** for each migration
5. Check for any errors (migrations use `IF NOT EXISTS` so they're safe to run multiple times)

### Option B: Using Supabase CLI (If you have it set up)

```bash
# If you have Supabase CLI installed
cd /workspace
supabase db push
```

## Step 3: Verify Tables Were Created

Run this SQL query in Supabase SQL Editor to verify all tables exist:

```sql
-- Check if all new tables exist
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'seller_badges',
    'seller_verifications',
    'support_tickets',
    'support_ticket_replies'
  )
ORDER BY table_name;
```

You should see all 4 tables listed.

## Step 4: Verify Columns Were Added

Check if notification_preferences column exists:

```sql
-- Check profiles table for new columns
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name IN (
    'notification_preferences',
    'email_verified',
    'phone_verified',
    'id_verified',
    'business_verified',
    'verification_level'
  )
ORDER BY column_name;
```

## Step 5: Test the Application

After migrations are applied:

1. **Test Help Center:**
   - Go to `/help` page
   - Try creating a support ticket
   - Check "My Tickets" tab (if logged in)

2. **Test Email Verification:**
   - Check if email verification banner appears for unverified users
   - Try resending verification email

3. **Test Seller Badges:**
   - Go to a listing detail page
   - Check if seller badges display
   - Go to `/seller/verification` to see verification status

4. **Test Notification Preferences:**
   - Go to `/settings/notifications`
   - Toggle notification preferences
   - Verify they save correctly

## Troubleshooting

### If migrations fail:

1. **Check for existing tables/columns:**
   - Migrations use `IF NOT EXISTS` so they're safe
   - If a table already exists, it will skip creation
   - If a column already exists, it will skip adding it

2. **Common errors:**
   - **Permission denied**: Make sure you're using the SQL Editor (has proper permissions)
   - **Syntax error**: Check if you copied the entire migration file
   - **Constraint violation**: Some migrations check for existing data

3. **Rollback (if needed):**
   - Most migrations are additive (adding new tables/columns)
   - If you need to rollback, you can manually drop tables:
   ```sql
   DROP TABLE IF EXISTS support_tickets CASCADE;
   DROP TABLE IF EXISTS support_ticket_replies CASCADE;
   DROP TABLE IF EXISTS seller_verifications CASCADE;
   ```

## Quick Verification Checklist

- [ ] All 4 new tables exist (seller_badges, seller_verifications, support_tickets, support_ticket_replies)
- [ ] notification_preferences column exists in profiles table
- [ ] Verification columns exist in profiles table (email_verified, phone_verified, etc.)
- [ ] Help Center page loads without errors
- [ ] Support ticket creation works
- [ ] Seller badges display on listing pages
- [ ] Notification preferences page works

## Need Help?

If you encounter issues:
1. Check Supabase logs in the dashboard
2. Check browser console for frontend errors
3. Verify environment variables are set correctly in Lovable
4. Make sure you're running migrations in the correct Supabase project
