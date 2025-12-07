-- Add printed_number column to pokemon_card_attributes
ALTER TABLE public.pokemon_card_attributes 
ADD COLUMN IF NOT EXISTS printed_number text;

-- Backfill printed_number from display_number (or number as fallback)
UPDATE public.pokemon_card_attributes 
SET printed_number = COALESCE(display_number, number)
WHERE printed_number IS NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_pokemon_card_attributes_printed_number 
ON public.pokemon_card_attributes(printed_number);