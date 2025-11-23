-- Add foreign key constraint from listings.card_id to pokemon_card_attributes.card_id
-- This allows the Browse page to properly join listings with their card data

ALTER TABLE listings
ADD CONSTRAINT listings_card_id_fkey
FOREIGN KEY (card_id)
REFERENCES pokemon_card_attributes(card_id)
ON DELETE SET NULL;