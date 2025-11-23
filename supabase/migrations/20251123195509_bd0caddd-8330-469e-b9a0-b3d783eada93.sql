-- Add SendCloud tracking table for parcel management
CREATE TABLE IF NOT EXISTS sendcloud_parcels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sendcloud_id TEXT UNIQUE NOT NULL,
  tracking_number TEXT,
  tracking_url TEXT,
  carrier TEXT,
  carrier_code TEXT,
  service_point_id TEXT,
  label_url TEXT,
  status TEXT NOT NULL DEFAULT 'announced',
  status_message TEXT,
  weight INTEGER, -- in grams
  shipment_uuid TEXT,
  external_order_id TEXT,
  external_shipment_id TEXT,
  customs_invoice_url TEXT,
  customs_shipment_type TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_sendcloud_parcels_order_id ON sendcloud_parcels(order_id);
CREATE INDEX idx_sendcloud_parcels_sendcloud_id ON sendcloud_parcels(sendcloud_id);
CREATE INDEX idx_sendcloud_parcels_tracking_number ON sendcloud_parcels(tracking_number);
CREATE INDEX idx_sendcloud_parcels_status ON sendcloud_parcels(status);

-- Enable RLS
ALTER TABLE sendcloud_parcels ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view parcels for their orders"
  ON sendcloud_parcels FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = sendcloud_parcels.order_id
      AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
    )
  );

-- Add shipping rates cache table
CREATE TABLE IF NOT EXISTS shipping_rates_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_country TEXT NOT NULL,
  from_postal_code TEXT NOT NULL,
  to_country TEXT NOT NULL,
  to_postal_code TEXT NOT NULL,
  weight INTEGER NOT NULL, -- in grams
  carrier_code TEXT NOT NULL,
  service_point_id TEXT,
  rate NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  estimated_days INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups (without WHERE clause to avoid immutable function requirement)
CREATE INDEX idx_shipping_rates_lookup ON shipping_rates_cache(
  from_country, from_postal_code, to_country, to_postal_code, weight, carrier_code, expires_at
);

-- Create address validation cache
CREATE TABLE IF NOT EXISTS address_validation_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address_hash TEXT UNIQUE NOT NULL,
  is_valid BOOLEAN NOT NULL,
  normalized_address JSONB,
  validation_details JSONB DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_address_validation_hash ON address_validation_cache(address_hash);
CREATE INDEX idx_address_validation_expires ON address_validation_cache(expires_at);

-- Update trigger for sendcloud_parcels
CREATE OR REPLACE FUNCTION update_sendcloud_parcel_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sendcloud_parcels_updated_at
  BEFORE UPDATE ON sendcloud_parcels
  FOR EACH ROW
  EXECUTE FUNCTION update_sendcloud_parcel_timestamp();