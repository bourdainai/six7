-- Stage 1: Add shipping fields to listings table
ALTER TABLE listings
ADD COLUMN shipping_cost_uk numeric DEFAULT 0,
ADD COLUMN shipping_cost_europe numeric DEFAULT 0,
ADD COLUMN shipping_cost_international numeric DEFAULT 0,
ADD COLUMN free_shipping boolean DEFAULT false,
ADD COLUMN package_weight numeric,
ADD COLUMN package_dimensions jsonb,
ADD COLUMN estimated_delivery_days integer DEFAULT 3;

-- Add shipping tracking fields to orders table
ALTER TABLE orders
ADD COLUMN shipping_status text DEFAULT 'awaiting_shipment',
ADD COLUMN tracking_number text,
ADD COLUMN carrier text,
ADD COLUMN shipped_at timestamp with time zone,
ADD COLUMN delivered_at timestamp with time zone,
ADD COLUMN shipping_cost numeric DEFAULT 0;

COMMENT ON COLUMN listings.shipping_cost_uk IS 'Shipping cost for UK destinations';
COMMENT ON COLUMN listings.shipping_cost_europe IS 'Shipping cost for European destinations';
COMMENT ON COLUMN listings.shipping_cost_international IS 'Shipping cost for international destinations';
COMMENT ON COLUMN listings.free_shipping IS 'Whether shipping is free for this listing';
COMMENT ON COLUMN listings.package_weight IS 'Package weight in kg';
COMMENT ON COLUMN listings.package_dimensions IS 'Package dimensions {length, width, height} in cm';
COMMENT ON COLUMN listings.estimated_delivery_days IS 'Estimated delivery time in days';

COMMENT ON COLUMN orders.shipping_status IS 'Shipping status: awaiting_shipment, shipped, in_transit, delivered, returned';
COMMENT ON COLUMN orders.tracking_number IS 'Carrier tracking number';
COMMENT ON COLUMN orders.carrier IS 'Shipping carrier name';
COMMENT ON COLUMN orders.shipped_at IS 'Timestamp when order was shipped';
COMMENT ON COLUMN orders.delivered_at IS 'Timestamp when order was delivered';
COMMENT ON COLUMN orders.shipping_cost IS 'Actual shipping cost charged';