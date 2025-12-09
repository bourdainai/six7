# Japanese Cards Fix - Setup Instructions for Lovable

## ✅ What's Already Done (Auto-deployed via Git)

The following Edge Functions have been pushed to git and should auto-deploy:
- `validate-card-images` - Validates image URLs
- `backfill-english-names` - Fetches English names from TCGdx API
- `fetch-missing-images` - Fetches missing images from TCGdx assets

The frontend code has also been updated with:
- Display logic to show English names
- Bulk action buttons in Admin Card Catalog
- Image validation status indicators

## 🔧 What Lovable Needs to Do

### 1. Run Database Migration (REQUIRED)

**File:** `supabase/migrations/20251209_add_image_validation.sql`

**Action:** Run this SQL migration in the Supabase SQL Editor:

```sql
-- Add image validation fields to pokemon_card_attributes table
ALTER TABLE pokemon_card_attributes
  ADD COLUMN IF NOT EXISTS image_validated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS image_validation_error TEXT,
  ADD COLUMN IF NOT EXISTS image_validated_at TIMESTAMPTZ;

-- Create index for efficient querying of unvalidated images
CREATE INDEX IF NOT EXISTS idx_card_attributes_image_validated 
  ON pokemon_card_attributes(image_validated) 
  WHERE image_validated = false;

-- Create index for cards with missing/invalid images
CREATE INDEX IF NOT EXISTS idx_card_attributes_needs_image_validation
  ON pokemon_card_attributes(sync_source, image_validated)
  WHERE (images->>'small' IS NOT NULL OR images->>'large' IS NOT NULL)
    AND image_validated = false;
```

**Why:** This adds the database columns needed to track image validation status.

### 2. Verify Edge Functions Are Deployed

Check that these Edge Functions exist in Supabase:
- `validate-card-images`
- `backfill-english-names`
- `fetch-missing-images`

If they don't auto-deploy, you may need to manually deploy them from the Supabase dashboard.

### 3. Test the Functions (Optional but Recommended)

After the migration is run, you can test the functions from the Admin Card Catalog page:
1. Go to `/admin/cards` (must be logged in as admin)
2. Use the bulk action buttons:
   - "Validate Images (Sample)" - Tests image validation on 50 cards
   - "Fetch English Names (100)" - Fetches English names for 100 Japanese cards
   - "Fetch Missing Images (100)" - Fetches missing images for 100 cards

## 📋 Summary

**Critical:** Run the database migration (step 1)
**Optional:** Verify Edge Functions are deployed (step 2)
**Optional:** Test the functions (step 3)

Once the migration is run, the system will:
- Track image validation status for all cards
- Display English names when available
- Support bulk operations to fix missing data

## 🐛 Troubleshooting

If Edge Functions fail:
- Check that admin authentication is working (user must have `admin` role in `user_roles` table)
- Check Edge Function logs in Supabase dashboard
- Verify TCGdx API is accessible (functions make external API calls)

If migration fails:
- Check if columns already exist (migration uses `IF NOT EXISTS` so it's safe to run multiple times)
- Verify you have permissions to alter the `pokemon_card_attributes` table

