-- Add fee breakdown columns to orders table for the new tiered pricing model
-- Buyer fee: 40p/50c base + 1% over £20/$25
-- Seller fee: 40p/50c base + 1% over £20/$25 (only charged when sold)

-- Add new fee columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS item_price DECIMAL(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS buyer_transaction_fee DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS seller_transaction_fee DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;

-- Add index for analytics queries on fees
CREATE INDEX IF NOT EXISTS idx_orders_paid_at ON orders(paid_at);
CREATE INDEX IF NOT EXISTS idx_orders_fees ON orders(buyer_transaction_fee, seller_transaction_fee);

-- Create a view for fee analytics
CREATE OR REPLACE VIEW order_fee_analytics AS
SELECT 
  DATE_TRUNC('day', paid_at) as day,
  currency,
  COUNT(*) as order_count,
  SUM(item_price) as total_gmv,
  SUM(buyer_transaction_fee) as total_buyer_fees,
  SUM(seller_transaction_fee) as total_seller_fees,
  SUM(platform_fee) as total_platform_fees,
  AVG(item_price) as avg_order_value
FROM orders
WHERE status = 'paid' AND paid_at IS NOT NULL
GROUP BY DATE_TRUNC('day', paid_at), currency
ORDER BY day DESC;

-- Grant access to the view
GRANT SELECT ON order_fee_analytics TO authenticated;
GRANT SELECT ON order_fee_analytics TO service_role;

COMMENT ON COLUMN orders.item_price IS 'The price of the item before any fees';
COMMENT ON COLUMN orders.buyer_transaction_fee IS 'Transaction fee charged to buyer (40p/50c base + 1% over threshold)';
COMMENT ON COLUMN orders.seller_transaction_fee IS 'Transaction fee charged to seller (40p/50c base + 1% over threshold)';
COMMENT ON COLUMN orders.paid_at IS 'Timestamp when payment was confirmed';

