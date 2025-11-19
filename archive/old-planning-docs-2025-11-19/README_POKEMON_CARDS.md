# Adding Pokemon Cards to the Marketplace

## Option 1: Using Supabase SQL Editor (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `add-pokemon-cards.sql`
4. Run the SQL script

## Option 2: Using the TypeScript Script

1. Make sure you have your Supabase credentials in `.env`:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

2. Install dependencies if needed:
   ```bash
   npm install
   ```

3. Run the script:
   ```bash
   npx tsx scripts/add-pokemon-cards.ts
   ```

## What Gets Added

Three Pokemon card listings with full details:

1. **Charizard Base Set Holo #4** - £850.00
   - Near Mint condition
   - Complete description
   - 3 images
   - All shipping details

2. **Pikachu Yellow Cheeks Base Set #58** - £450.00
   - Mint condition
   - Rare variant description
   - 2 images
   - All shipping details

3. **Blastoise Base Set Holo #2** - £320.00
   - Excellent condition
   - Complete description
   - 3 images
   - All shipping details

All cards include:
- Full descriptions
- Pricing (original RRP, seller price, suggested prices)
- Condition details
- Style tags
- Shipping information
- Package dimensions
- Images (using placeholder URLs - replace with actual Pokemon card images)

## Viewing the Cards

After adding, view them at:
- Browse page: http://localhost:8080/browse
- Individual listings: http://localhost:8080/listing/{id}
