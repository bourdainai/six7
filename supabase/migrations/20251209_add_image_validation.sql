-- Add image validation fields to pokemon_card_attributes table
-- This allows tracking whether card images are actually valid/accessible

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

COMMENT ON COLUMN pokemon_card_attributes.image_validated IS 'Whether the image URL has been validated and is accessible';
COMMENT ON COLUMN pokemon_card_attributes.image_validation_error IS 'Error message if image validation failed';
COMMENT ON COLUMN pokemon_card_attributes.image_validated_at IS 'Timestamp when image was last validated';

