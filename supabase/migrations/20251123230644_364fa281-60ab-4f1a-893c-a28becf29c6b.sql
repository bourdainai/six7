-- Drop incorrect foreign keys that reference auth.users
ALTER TABLE trade_offers
  DROP CONSTRAINT IF EXISTS trade_offers_buyer_id_fkey,
  DROP CONSTRAINT IF EXISTS trade_offers_seller_id_fkey;

-- Add correct foreign keys that reference profiles  
ALTER TABLE trade_offers
  ADD CONSTRAINT trade_offers_buyer_id_fkey 
  FOREIGN KEY (buyer_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  ADD CONSTRAINT trade_offers_seller_id_fkey 
  FOREIGN KEY (seller_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_trade_offers_buyer_id ON trade_offers(buyer_id);
CREATE INDEX IF NOT EXISTS idx_trade_offers_seller_id ON trade_offers(seller_id);
CREATE INDEX IF NOT EXISTS idx_trade_offers_status ON trade_offers(status);
CREATE INDEX IF NOT EXISTS idx_trade_offers_created_at ON trade_offers(created_at DESC);
