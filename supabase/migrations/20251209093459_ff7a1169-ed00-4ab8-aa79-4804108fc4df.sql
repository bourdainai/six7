-- Performance indexes for common query patterns
-- Listings table indexes
CREATE INDEX IF NOT EXISTS idx_listings_status_published ON listings(status, published_at DESC) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_listings_seller_status ON listings(seller_id, status);
CREATE INDEX IF NOT EXISTS idx_listings_category_status ON listings(category, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_listings_price_status ON listings(seller_price, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_listings_condition_status ON listings(condition, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_listings_marketplace ON listings(marketplace, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_listings_card_id ON listings(card_id) WHERE card_id IS NOT NULL;

-- Pokemon card attributes indexes for search and filtering
CREATE INDEX IF NOT EXISTS idx_pokemon_cards_set_code ON pokemon_card_attributes(set_code);
CREATE INDEX IF NOT EXISTS idx_pokemon_cards_rarity ON pokemon_card_attributes(rarity);
CREATE INDEX IF NOT EXISTS idx_pokemon_cards_name_trgm ON pokemon_card_attributes USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_pokemon_cards_set_name_trgm ON pokemon_card_attributes USING gin(set_name gin_trgm_ops);

-- Orders table indexes
CREATE INDEX IF NOT EXISTS idx_orders_buyer_status ON orders(buyer_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_seller_status ON orders(seller_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- Listing variants indexes
CREATE INDEX IF NOT EXISTS idx_variants_listing_available ON listing_variants(listing_id, is_available) WHERE is_available = true;
CREATE INDEX IF NOT EXISTS idx_variants_not_sold ON listing_variants(listing_id) WHERE is_sold = false;

-- Image validation tracking columns for pokemon_card_attributes
ALTER TABLE pokemon_card_attributes ADD COLUMN IF NOT EXISTS image_validated boolean DEFAULT false;
ALTER TABLE pokemon_card_attributes ADD COLUMN IF NOT EXISTS image_validation_error text;
ALTER TABLE pokemon_card_attributes ADD COLUMN IF NOT EXISTS image_validated_at timestamp with time zone;