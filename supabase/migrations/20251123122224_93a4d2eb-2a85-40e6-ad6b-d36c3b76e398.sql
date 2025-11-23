-- Create progress tracking table for TCGdex imports
CREATE TABLE IF NOT EXISTS tcgdex_import_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_code varchar NOT NULL,
  language varchar NOT NULL,
  status varchar NOT NULL DEFAULT 'pending',
  cards_imported int DEFAULT 0,
  cards_total int DEFAULT 0,
  last_card_number int DEFAULT 0,
  error_message text,
  retry_count int DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(set_code, language)
);

-- Add RLS policies
ALTER TABLE tcgdex_import_progress ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage import progress
CREATE POLICY "Service role can manage import progress"
ON tcgdex_import_progress
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Admins can view import progress
CREATE POLICY "Admins can view import progress"
ON tcgdex_import_progress
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_tcgdex_import_status 
ON tcgdex_import_progress(status, language);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_tcgdex_import_progress_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tcgdex_import_progress_timestamp
BEFORE UPDATE ON tcgdex_import_progress
FOR EACH ROW
EXECUTE FUNCTION update_tcgdex_import_progress_timestamp();