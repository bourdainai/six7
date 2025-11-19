-- Create trade_offers table
CREATE TABLE IF NOT EXISTS trade_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id UUID REFERENCES auth.users(id) NOT NULL,
  seller_id UUID REFERENCES auth.users(id) NOT NULL,
  target_listing_id UUID REFERENCES listings(id) NOT NULL,
  cash_amount DECIMAL(10,2) DEFAULT 0.00,
  trade_items JSONB NOT NULL, -- Array of objects: [{listing_id, valuation, photos}]
  trade_item_valuations JSONB, -- Store AI or user valuations snapshot
  photos TEXT[], -- Additional photos of the offer package
  ai_valuation_summary TEXT,
  ai_fairness_score DECIMAL(3,2), -- 0.00 to 1.00
  status VARCHAR(50) DEFAULT 'pending', -- pending, accepted, rejected, countered, expired, completed
  expiry_date TIMESTAMP WITH TIME ZONE,
  counter_offer_id UUID REFERENCES trade_offers(id), -- If this offer is a counter to another
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trade_offers_buyer ON trade_offers(buyer_id);
CREATE INDEX IF NOT EXISTS idx_trade_offers_seller ON trade_offers(seller_id);
CREATE INDEX IF NOT EXISTS idx_trade_offers_status ON trade_offers(status);
CREATE INDEX IF NOT EXISTS idx_trade_offers_target_listing ON trade_offers(target_listing_id);

-- Enable RLS
ALTER TABLE trade_offers ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Buyers can view their own offers
CREATE POLICY "Buyers can view their own trade offers" 
  ON trade_offers FOR SELECT 
  USING (auth.uid() = buyer_id);

-- Sellers can view offers received
CREATE POLICY "Sellers can view received trade offers" 
  ON trade_offers FOR SELECT 
  USING (auth.uid() = seller_id);

-- Buyers can create offers
CREATE POLICY "Buyers can create trade offers" 
  ON trade_offers FOR INSERT 
  WITH CHECK (auth.uid() = buyer_id);

-- Only service role or specific logic for updates (often better to use functions for status changes)
-- But allowing status update by participants for MVP
CREATE POLICY "Participants can update status" 
  ON trade_offers FOR UPDATE 
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

