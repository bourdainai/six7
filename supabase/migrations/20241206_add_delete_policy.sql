-- Add DELETE policy for pokemon_card_attributes
-- Service role bypasses RLS, but adding explicit policy for clarity

-- Drop existing policies if they exist (to recreate cleanly)
DROP POLICY IF EXISTS "Service role can delete pokemon attributes" ON pokemon_card_attributes;
DROP POLICY IF EXISTS "Service role can insert pokemon attributes" ON pokemon_card_attributes;
DROP POLICY IF EXISTS "Service role can update pokemon attributes" ON pokemon_card_attributes;

-- Allow service role to delete (Edge Functions use service role key)
CREATE POLICY "Service role can delete pokemon attributes"
  ON pokemon_card_attributes FOR DELETE
  USING (true);

-- Allow service role to insert
CREATE POLICY "Service role can insert pokemon attributes"
  ON pokemon_card_attributes FOR INSERT
  WITH CHECK (true);

-- Allow service role to update  
CREATE POLICY "Service role can update pokemon attributes"
  ON pokemon_card_attributes FOR UPDATE
  USING (true)
  WITH CHECK (true);

