-- Add card_number column to listings table for better accessibility
ALTER TABLE listings ADD COLUMN IF NOT EXISTS card_number VARCHAR;

-- Add index for faster queries on card_number
CREATE INDEX IF NOT EXISTS idx_listings_card_number ON listings(card_number);

-- Add comment
COMMENT ON COLUMN listings.card_number IS 'Full Pokemon card number (e.g., 122/094)';