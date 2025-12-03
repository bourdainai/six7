-- Add English name column to pokemon_card_attributes
ALTER TABLE public.pokemon_card_attributes
ADD COLUMN IF NOT EXISTS name_en TEXT;

-- Add index for searching by English name
CREATE INDEX IF NOT EXISTS idx_pokemon_card_attributes_name_en 
ON public.pokemon_card_attributes(name_en);

-- Add comment for documentation
COMMENT ON COLUMN public.pokemon_card_attributes.name_en IS 'English name for Japanese cards, populated from dexId mapping';