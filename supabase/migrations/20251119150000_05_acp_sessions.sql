-- Create acp_sessions table
CREATE TABLE IF NOT EXISTS acp_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES auth.users(id), -- If agent is authenticated user
  status VARCHAR(50) DEFAULT 'active', -- active, completed, expired
  cart_items JSONB,
  total_amount DECIMAL(10,2),
  shipping_address JSONB,
  payment_intent_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Create api_keys table for agents
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  key_hash VARCHAR(255) NOT NULL,
  label VARCHAR(100),
  scopes TEXT[], -- 'read_products', 'purchase', 'trade'
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE acp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their API keys" 
  ON api_keys FOR ALL 
  USING (auth.uid() = user_id);

