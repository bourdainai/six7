-- Add fee breakdown columns to orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS item_price numeric,
ADD COLUMN IF NOT EXISTS buyer_transaction_fee numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS seller_transaction_fee numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS paid_at timestamp with time zone;

-- Add index for faster reporting queries
CREATE INDEX IF NOT EXISTS idx_orders_paid_at ON public.orders(paid_at) WHERE paid_at IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.orders.buyer_transaction_fee IS '6Seven fee charged to buyer (40p base + 1% over £20)';
COMMENT ON COLUMN public.orders.seller_transaction_fee IS '6Seven fee charged to seller (40p base + 1% over £20)';
COMMENT ON COLUMN public.orders.item_price IS 'Original item price before fees and shipping';