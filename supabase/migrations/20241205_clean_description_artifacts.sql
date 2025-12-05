-- Migration: Clean markdown artifacts from AI-generated descriptions
-- This removes ** and ## formatting that was incorrectly added by AI

-- First, let's see how many listings are affected
SELECT COUNT(*) as affected_listings
FROM listings 
WHERE description LIKE '%**%' OR description LIKE '%##%';

-- Clean the descriptions
UPDATE listings 
SET 
  description = REGEXP_REPLACE(
    REGEXP_REPLACE(description, '\*\*', '', 'g'),
    '##', '', 'g'
  ),
  updated_at = NOW()
WHERE description LIKE '%**%' OR description LIKE '%##%';

-- Also clean any bullet point artifacts
UPDATE listings
SET 
  description = REGEXP_REPLACE(description, '^\s*[-•]\s*', '', 'gm'),
  updated_at = NOW()
WHERE description ~ '^\s*[-•]\s*';

-- Add column for tracking last price update if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pokemon_card_attributes' 
    AND column_name = 'last_price_update'
  ) THEN
    ALTER TABLE pokemon_card_attributes 
    ADD COLUMN last_price_update TIMESTAMPTZ;
  END IF;
END $$;

-- Create index for faster queries on cards missing images
CREATE INDEX IF NOT EXISTS idx_cards_missing_images 
ON pokemon_card_attributes ((images IS NULL OR images->>'small' IS NULL));

-- Create index for price update tracking
CREATE INDEX IF NOT EXISTS idx_cards_price_update 
ON pokemon_card_attributes (last_price_update);

