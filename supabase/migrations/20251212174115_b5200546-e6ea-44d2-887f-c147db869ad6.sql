-- Fix TCGdex image URLs that are missing /high.webp and /low.webp suffixes
-- This migration corrects existing broken image URLs

-- Update tcgdex cards where images don't have proper webp extension
UPDATE pokemon_card_attributes
SET 
  images = jsonb_build_object(
    'small', CASE 
      WHEN (images->>'small') IS NOT NULL 
           AND (images->>'small') NOT LIKE '%.webp' 
           AND (images->>'small') NOT LIKE '%.png'
           AND (images->>'small') NOT LIKE '%.jpg'
      THEN (images->>'small') || '/low.webp'
      ELSE images->>'small'
    END,
    'large', CASE 
      WHEN (images->>'large') IS NOT NULL 
           AND (images->>'large') NOT LIKE '%.webp' 
           AND (images->>'large') NOT LIKE '%.png'
           AND (images->>'large') NOT LIKE '%.jpg'
      THEN (images->>'large') || '/high.webp'
      ELSE images->>'large'
    END,
    'tcgdex', CASE 
      WHEN (images->>'large') IS NOT NULL 
           AND (images->>'large') NOT LIKE '%.webp' 
           AND (images->>'large') NOT LIKE '%.png'
           AND (images->>'large') NOT LIKE '%.jpg'
      THEN (images->>'large') || '/high.webp'
      ELSE COALESCE(images->>'tcgdex', images->>'large')
    END
  ),
  image_validated = NULL,  -- Reset validation status so they get re-validated
  image_validation_error = NULL,
  updated_at = NOW()
WHERE sync_source = 'tcgdex'
  AND images IS NOT NULL
  AND (
    (images->>'small' IS NOT NULL AND images->>'small' NOT LIKE '%.webp' AND images->>'small' NOT LIKE '%.png')
    OR (images->>'large' IS NOT NULL AND images->>'large' NOT LIKE '%.webp' AND images->>'large' NOT LIKE '%.png')
  );

-- Add an index on image_validated for faster filtering during validation runs
CREATE INDEX IF NOT EXISTS idx_pokemon_cards_image_validated 
ON pokemon_card_attributes (image_validated) 
WHERE image_validated IS NULL OR image_validated = false;

-- Add an index on sync_source for faster filtering
CREATE INDEX IF NOT EXISTS idx_pokemon_cards_sync_source 
ON pokemon_card_attributes (sync_source);

-- Add a composite index for efficient repair queries
CREATE INDEX IF NOT EXISTS idx_pokemon_cards_sync_source_validated 
ON pokemon_card_attributes (sync_source, image_validated) 
WHERE image_validated IS NULL OR image_validated = false;