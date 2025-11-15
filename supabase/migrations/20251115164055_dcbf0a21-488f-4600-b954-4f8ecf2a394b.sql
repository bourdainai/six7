-- Phase 1: Add performance indexes for frequently queried columns

-- Listings table indexes
CREATE INDEX IF NOT EXISTS idx_listings_seller_id ON public.listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON public.listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON public.listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_category ON public.listings(category);
CREATE INDEX IF NOT EXISTS idx_listings_published_at ON public.listings(published_at DESC) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_listings_stale_risk ON public.listings(stale_risk_score DESC) WHERE stale_risk_score > 0;

-- Orders table indexes
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON public.orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON public.orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- Messages table indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);

-- Conversations table indexes
CREATE INDEX IF NOT EXISTS idx_conversations_buyer_id ON public.conversations(buyer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_seller_id ON public.conversations(seller_id);
CREATE INDEX IF NOT EXISTS idx_conversations_listing_id ON public.conversations(listing_id);

-- Offers table indexes
CREATE INDEX IF NOT EXISTS idx_offers_listing_id ON public.offers(listing_id);
CREATE INDEX IF NOT EXISTS idx_offers_buyer_id ON public.offers(buyer_id);
CREATE INDEX IF NOT EXISTS idx_offers_seller_id ON public.offers(seller_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON public.offers(status);

-- Disputes table indexes
CREATE INDEX IF NOT EXISTS idx_disputes_order_id ON public.disputes(order_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON public.disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_created_at ON public.disputes(created_at DESC);

-- Search history indexes
CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON public.search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_created_at ON public.search_history(created_at DESC);

-- Buyer agent activities indexes
CREATE INDEX IF NOT EXISTS idx_buyer_agent_user_id ON public.buyer_agent_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_buyer_agent_created_at ON public.buyer_agent_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_buyer_agent_notified_at ON public.buyer_agent_activities(notified_at) WHERE notified_at IS NULL;

-- Fraud flags indexes
CREATE INDEX IF NOT EXISTS idx_fraud_flags_listing_id ON public.fraud_flags(listing_id);
CREATE INDEX IF NOT EXISTS idx_fraud_flags_status ON public.fraud_flags(status);
CREATE INDEX IF NOT EXISTS idx_fraud_flags_risk_score ON public.fraud_flags(risk_score DESC);

-- Seller reputation indexes
CREATE INDEX IF NOT EXISTS idx_seller_reputation_seller_id ON public.seller_reputation(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_reputation_score ON public.seller_reputation(reputation_score DESC);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_listings_seller_status ON public.listings(seller_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_status ON public.orders(buyer_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_seller_status ON public.orders(seller_id, status);