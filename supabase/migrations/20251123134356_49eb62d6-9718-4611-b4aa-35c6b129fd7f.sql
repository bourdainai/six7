-- Add read_at timestamp to messages table for precise read tracking
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster unread message queries
CREATE INDEX IF NOT EXISTS idx_messages_read_status ON messages(conversation_id, read, created_at);

-- Create index for read_at queries
CREATE INDEX IF NOT EXISTS idx_messages_read_at ON messages(conversation_id, read_at) WHERE read_at IS NOT NULL;

-- Update existing read messages to have read_at timestamp
UPDATE messages 
SET read_at = created_at 
WHERE read = true AND read_at IS NULL;