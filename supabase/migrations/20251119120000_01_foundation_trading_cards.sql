-- Extend listings table with trading card specific columns
ALTER TABLE listings ADD COLUMN IF NOT EXISTS card_id VARCHAR(255);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS set_code VARCHAR(50);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS card_number VARCHAR(50);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS rarity VARCHAR(100);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS condition VARCHAR(50);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS grading_service VARCHAR(50);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS grading_score DECIMAL(3,1);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS trade_enabled BOOLEAN DEFAULT true;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS attributes JSONB;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS comps JSONB;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS shipping_methods JSONB;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS bundle_id UUID; -- REFERENCES bundles(id) will be added in Phase 13

-- Create indexes for listings
CREATE INDEX IF NOT EXISTS idx_listings_card_id ON listings(card_id);
CREATE INDEX IF NOT EXISTS idx_listings_set_code ON listings(set_code);
CREATE INDEX IF NOT EXISTS idx_listings_condition ON listings(condition);

-- Create pokemon_card_attributes table
CREATE TABLE IF NOT EXISTS pokemon_card_attributes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  set_name VARCHAR(255) NOT NULL,
  set_code VARCHAR(50) NOT NULL,
  number VARCHAR(50) NOT NULL,
  rarity VARCHAR(100),
  artist VARCHAR(255),
  types TEXT[],
  subtypes TEXT[],
  supertype VARCHAR(100),
  images JSONB,
  tcgplayer_id VARCHAR(255),
  cardmarket_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pokemon_card_attributes_card_id ON pokemon_card_attributes(card_id);
CREATE INDEX IF NOT EXISTS idx_pokemon_card_attributes_set_code ON pokemon_card_attributes(set_code);

-- Create pricing_comps table
CREATE TABLE IF NOT EXISTS pricing_comps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id VARCHAR(255) NOT NULL, -- Links to pokemon_card_attributes.card_id
  source VARCHAR(50) NOT NULL, -- 'tcgplayer', 'cardmarket', 'ebay_sold'
  price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'GBP',
  condition VARCHAR(50),
  date_sold TIMESTAMP WITH TIME ZONE,
  listing_title TEXT,
  listing_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pricing_comps_card_id ON pricing_comps(card_id);
CREATE INDEX IF NOT EXISTS idx_pricing_comps_date_sold ON pricing_comps(date_sold);

-- Create market_prices table
CREATE TABLE IF NOT EXISTS market_prices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id VARCHAR(255) UNIQUE NOT NULL,
  low_price DECIMAL(10,2),
  mid_price DECIMAL(10,2),
  high_price DECIMAL(10,2),
  market_price DECIMAL(10,2),
  direct_low DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'GBP',
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_prices_card_id ON market_prices(card_id);

-- Enable Row Level Security
ALTER TABLE pokemon_card_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_comps ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_prices ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- pokemon_card_attributes: Readable by everyone, writable only by service role (admin/functions)
CREATE POLICY "Pokemon attributes are viewable by everyone" 
  ON pokemon_card_attributes FOR SELECT 
  USING (true);

-- pricing_comps: Readable by everyone, writable only by service role
CREATE POLICY "Pricing comps are viewable by everyone" 
  ON pricing_comps FOR SELECT 
  USING (true);

-- market_prices: Readable by everyone, writable only by service role
CREATE POLICY "Market prices are viewable by everyone" 
  ON market_prices FOR SELECT 
  USING (true);

