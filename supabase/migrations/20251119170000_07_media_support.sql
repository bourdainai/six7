-- Create listing_media table
CREATE TABLE IF NOT EXISTS listing_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID REFERENCES listings(id) NOT NULL,
  type VARCHAR(20) NOT NULL, -- 'image' or 'video'
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  position INTEGER DEFAULT 0,
  ai_enhanced BOOLEAN DEFAULT false,
  quality_score DECIMAL(3,2),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listing_media_listing ON listing_media(listing_id, position);

ALTER TABLE listing_media ENABLE ROW LEVEL SECURITY;

-- Create view for feed
CREATE OR REPLACE VIEW listing_feed AS
SELECT l.*, lm.url as video_url, lm.thumbnail_url
FROM listings l
LEFT JOIN listing_media lm ON l.id = lm.listing_id AND lm.type = 'video'
WHERE l.status = 'active' AND lm.url IS NOT NULL;

