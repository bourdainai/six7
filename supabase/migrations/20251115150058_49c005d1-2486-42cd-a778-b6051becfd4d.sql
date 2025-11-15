-- Phase 1: Enhanced Vision & Image AI Layer
-- Add advanced image analysis fields to listing_images table

ALTER TABLE listing_images 
  ADD COLUMN IF NOT EXISTS quality_score INTEGER DEFAULT 0 CHECK (quality_score >= 0 AND quality_score <= 100),
  ADD COLUMN IF NOT EXISTS lighting_score INTEGER DEFAULT 0 CHECK (lighting_score >= 0 AND lighting_score <= 100),
  ADD COLUMN IF NOT EXISTS angle_score INTEGER DEFAULT 0 CHECK (angle_score >= 0 AND angle_score <= 100),
  ADD COLUMN IF NOT EXISTS background_score INTEGER DEFAULT 0 CHECK (background_score >= 0 AND background_score <= 100),
  ADD COLUMN IF NOT EXISTS damage_detected JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS counterfeit_risk_score INTEGER DEFAULT 0 CHECK (counterfeit_risk_score >= 0 AND counterfeit_risk_score <= 100),
  ADD COLUMN IF NOT EXISTS logo_detected JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_stock_photo BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS item_segmented BOOLEAN DEFAULT false;

-- Add index for querying by quality scores
CREATE INDEX IF NOT EXISTS idx_listing_images_quality ON listing_images(quality_score);
CREATE INDEX IF NOT EXISTS idx_listing_images_counterfeit ON listing_images(counterfeit_risk_score);

COMMENT ON COLUMN listing_images.quality_score IS 'Overall image quality score 0-100';
COMMENT ON COLUMN listing_images.lighting_score IS 'Lighting quality score 0-100';
COMMENT ON COLUMN listing_images.angle_score IS 'Camera angle quality score 0-100';
COMMENT ON COLUMN listing_images.background_score IS 'Background cleanliness score 0-100';
COMMENT ON COLUMN listing_images.damage_detected IS 'Array of detected damage: [{type: "stain"|"tear"|"wear", confidence: 0-100, location: "..."}]';
COMMENT ON COLUMN listing_images.counterfeit_risk_score IS 'Counterfeit risk assessment 0-100';
COMMENT ON COLUMN listing_images.logo_detected IS 'Array of detected logos: [{brand: "...", confidence: 0-100, authentic: boolean}]';
COMMENT ON COLUMN listing_images.is_stock_photo IS 'Whether image appears to be a stock/catalog photo';
COMMENT ON COLUMN listing_images.item_segmented IS 'Whether item has been successfully segmented from background';