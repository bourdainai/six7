# Quick Guide: Add Pokemon Cards

## Method 1: Run the Script (Easiest)

1. **Get your Supabase credentials:**
   - Go to your Supabase Dashboard
   - Project Settings → API
   - Copy the "Project URL" and "anon public" key

2. **Run the script:**
   ```bash
   VITE_SUPABASE_URL="your_url_here" VITE_SUPABASE_ANON_KEY="your_key_here" node add-pokemon-cards-simple.mjs
   ```

   Or create a `.env.local` file:
   ```
   VITE_SUPABASE_URL=your_url_here
   VITE_SUPABASE_ANON_KEY=your_key_here
   ```
   Then run: `node add-pokemon-cards-simple.mjs`

## Method 2: Use Supabase SQL Editor (Recommended)

1. Go to your Supabase Dashboard
2. Click "SQL Editor" in the left sidebar
3. Copy the entire contents of `add-pokemon-cards.sql`
4. Paste into the SQL Editor
5. Click "Run"

The cards will appear immediately on your browse page!

## What Gets Added

- **Charizard Base Set Holo** - £850.00
- **Pikachu Yellow Cheeks** - £450.00  
- **Blastoise Base Set Holo** - £320.00

All with full descriptions, images, and shipping details.
