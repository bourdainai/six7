
-- Add price fields to pokemon_card_attributes table
ALTER TABLE pokemon_card_attributes
ADD COLUMN IF NOT EXISTS tcgplayer_prices jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS cardmarket_prices jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_price_update timestamp with time zone DEFAULT NULL;

COMMENT ON COLUMN pokemon_card_attributes.tcgplayer_prices IS 'TCGPlayer market prices (low, mid, high, market)';
COMMENT ON COLUMN pokemon_card_attributes.cardmarket_prices IS 'Cardmarket prices (averageSellPrice, lowPrice, trendPrice)';
COMMENT ON COLUMN pokemon_card_attributes.last_price_update IS 'When prices were last fetched';
