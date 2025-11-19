-- Create bundles table
CREATE TABLE IF NOT EXISTS bundles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID REFERENCES auth.users(id) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE bundles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public bundles are viewable by everyone" ON bundles FOR SELECT USING (true);
CREATE POLICY "Sellers can create bundles" ON bundles FOR INSERT WITH CHECK (auth.uid() = seller_id);

-- Add bundle_id FK to listings if not exists (already added in Phase 1 but validating)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'listings_bundle_id_fkey') THEN
    ALTER TABLE listings ADD CONSTRAINT listings_bundle_id_fkey FOREIGN KEY (bundle_id) REFERENCES bundles(id);
  END IF;
END $$;

