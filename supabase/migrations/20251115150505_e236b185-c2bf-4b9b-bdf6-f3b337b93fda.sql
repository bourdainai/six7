-- Phase 2: Semantic Search & Discovery Engine
-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Create embeddings table for listing vector representations
CREATE TABLE IF NOT EXISTS listing_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE UNIQUE,
  embedding VECTOR(1536), -- OpenAI/Gemini embedding dimension
  model_used TEXT NOT NULL DEFAULT 'text-embedding-3-small',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for vector similarity search (cosine distance)
CREATE INDEX IF NOT EXISTS idx_listing_embeddings_vector ON listing_embeddings 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create index for faster lookup by listing_id
CREATE INDEX IF NOT EXISTS idx_listing_embeddings_listing_id ON listing_embeddings(listing_id);

-- Enable RLS
ALTER TABLE listing_embeddings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for embeddings
CREATE POLICY "Embeddings viewable with listing visibility" ON listing_embeddings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = listing_embeddings.listing_id
      AND (listings.status = 'active' OR listings.seller_id = auth.uid())
    )
  );

-- Create search history table for learning
CREATE TABLE IF NOT EXISTS search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  search_query TEXT NOT NULL,
  search_type TEXT NOT NULL, -- 'text', 'semantic', 'vibe', 'outfit'
  results_count INTEGER DEFAULT 0,
  filters_applied JSONB DEFAULT '{}'::jsonb,
  clicked_listings JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_created_at ON search_history(created_at DESC);

-- Enable RLS
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own search history" ON search_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own search history" ON search_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to update embedding updated_at timestamp
CREATE OR REPLACE FUNCTION update_embedding_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_listing_embeddings_timestamp
  BEFORE UPDATE ON listing_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION update_embedding_timestamp();

COMMENT ON TABLE listing_embeddings IS 'Vector embeddings for semantic search on listings';
COMMENT ON TABLE search_history IS 'User search history for learning and recommendations';