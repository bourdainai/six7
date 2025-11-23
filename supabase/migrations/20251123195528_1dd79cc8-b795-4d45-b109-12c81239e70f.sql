-- Enable RLS on cache tables
ALTER TABLE shipping_rates_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE address_validation_cache ENABLE ROW LEVEL SECURITY;

-- Shipping rates cache is public (readable by everyone for performance)
CREATE POLICY "Shipping rates are publicly readable"
  ON shipping_rates_cache FOR SELECT
  USING (true);

-- Address validation cache is public (readable by everyone for performance)
CREATE POLICY "Address validation is publicly readable"
  ON address_validation_cache FOR SELECT
  USING (true);