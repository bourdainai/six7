-- Create Pokemon English names lookup table
CREATE TABLE public.pokemon_english_names (
  dex_id INTEGER PRIMARY KEY,
  japanese_name TEXT NOT NULL,
  english_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for fast Japanese name lookups
CREATE INDEX idx_pokemon_english_names_japanese ON public.pokemon_english_names(japanese_name);

-- Enable RLS but allow public read access (this is reference data)
ALTER TABLE public.pokemon_english_names ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read pokemon names"
ON public.pokemon_english_names
FOR SELECT
USING (true);

-- Only service role can insert/update (via edge functions)
CREATE POLICY "Service role can manage pokemon names"
ON public.pokemon_english_names
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');