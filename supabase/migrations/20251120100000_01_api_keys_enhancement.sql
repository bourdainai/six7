-- Enhance api_keys table with additional fields for production use
ALTER TABLE api_keys 
ADD COLUMN IF NOT EXISTS rate_limit_per_hour INTEGER DEFAULT 1000,
ADD COLUMN IF NOT EXISTS rate_limit_per_day INTEGER DEFAULT 10000,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create api_key_usage_logs table for rate limiting tracking
CREATE TABLE IF NOT EXISTS api_key_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_key_usage_logs_api_key_id ON api_key_usage_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_logs_created_at ON api_key_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_logs_api_key_created ON api_key_usage_logs(api_key_id, created_at);

-- Enable RLS on usage logs
ALTER TABLE api_key_usage_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own API key usage logs
CREATE POLICY "Users can view their own API key usage logs"
  ON api_key_usage_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM api_keys 
      WHERE api_keys.id = api_key_usage_logs.api_key_id 
      AND api_keys.user_id = auth.uid()
    )
  );

-- Add comment for documentation
COMMENT ON COLUMN api_keys.rate_limit_per_hour IS 'Maximum requests allowed per hour for this API key';
COMMENT ON COLUMN api_keys.rate_limit_per_day IS 'Maximum requests allowed per day for this API key';
COMMENT ON COLUMN api_keys.expires_at IS 'Optional expiration date for the API key';
COMMENT ON COLUMN api_keys.is_active IS 'Whether the API key is currently active';

