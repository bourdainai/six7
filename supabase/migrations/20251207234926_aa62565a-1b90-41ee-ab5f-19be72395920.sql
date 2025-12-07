-- Add set_name_en column to pokemon_card_attributes table
ALTER TABLE public.pokemon_card_attributes 
ADD COLUMN IF NOT EXISTS set_name_en text;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_pokemon_card_attributes_set_name_en 
ON public.pokemon_card_attributes(set_name_en);