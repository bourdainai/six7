-- Performance optimization indexes for faster queries
-- This migration adds indexes for common query patterns to improve site performance

-- Browse page filters - composite indexes for common filter combinations
CREATE INDEX IF NOT EXISTS idx_listings_marketplace_status ON listings(marketplace, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_listings_brand_active ON listings(brand) WHERE status = 'active' AND brand IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_listings_price_range ON listings(seller_price) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_listings_category_subcategory ON listings(category, subcategory) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_listings_condition_active ON listings(condition) WHERE status = 'active' AND condition IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_listings_set_code_active ON listings(set_code) WHERE status = 'active' AND set_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_listings_card_number_active ON listings(card_number) WHERE status = 'active' AND card_number IS NOT NULL;

-- Listing variants optimization
CREATE INDEX IF NOT EXISTS idx_listing_variants_listing_available ON listing_variants(listing_id, is_available) WHERE is_available = true;
CREATE INDEX IF NOT EXISTS idx_listing_variants_display_order ON listing_variants(listing_id, display_order) WHERE is_available = true;

-- Messages optimization - improve conversation queries
CREATE INDEX IF NOT EXISTS idx_conversations_buyer_seller_updated ON conversations(buyer_id, seller_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at DESC);

-- Seller dashboard optimization
CREATE INDEX IF NOT EXISTS idx_listings_seller_created ON listings(seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_seller_status_created ON orders(seller_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_seller_paid ON orders(seller_id, status, created_at DESC) WHERE status = 'paid';

-- Listing images optimization
CREATE INDEX IF NOT EXISTS idx_listing_images_listing_order ON listing_images(listing_id, display_order);

-- Search optimization - text search indexes
CREATE INDEX IF NOT EXISTS idx_listings_title_trgm ON listings USING gin(title gin_trgm_ops) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_listings_description_trgm ON listings USING gin(description gin_trgm_ops) WHERE status = 'active';

-- Enable pg_trgm extension for text search if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Composite index for common browse queries (marketplace + category + price)
CREATE INDEX IF NOT EXISTS idx_listings_marketplace_category_price ON listings(marketplace, category, seller_price) WHERE status = 'active';

-- Index for sorting by views (popular listings)
CREATE INDEX IF NOT EXISTS idx_listings_views_active ON listings(views DESC) WHERE status = 'active' AND views IS NOT NULL;

