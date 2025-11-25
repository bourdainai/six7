-- Add variant reservation system to prevent race conditions
ALTER TABLE listing_variants 
ADD COLUMN IF NOT EXISTS reserved_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reserved_by UUID REFERENCES auth.users(id);

-- Create index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_listing_variants_reserved_until ON listing_variants(reserved_until) WHERE reserved_until IS NOT NULL;

-- Add comment explaining the reservation system
COMMENT ON COLUMN listing_variants.reserved_until IS 'Timestamp when the reservation expires. Variants are reserved during checkout and marked as sold when payment succeeds.';
COMMENT ON COLUMN listing_variants.reserved_by IS 'User ID who reserved this variant during checkout.';

-- Function to clean up expired reservations (can be called periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_variant_reservations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE listing_variants
  SET reserved_until = NULL,
      reserved_by = NULL
  WHERE reserved_until IS NOT NULL 
    AND reserved_until < NOW()
    AND is_sold = FALSE;
END;
$$;