-- Create message-attachments storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message-attachments',
  'message-attachments',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'video/mp4', 'video/quicktime']
);

-- RLS Policies for message-attachments bucket
CREATE POLICY "Users can upload attachments to their conversations"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'message-attachments' AND
  auth.uid() IN (
    SELECT buyer_id FROM conversations WHERE id::text = (storage.foldername(name))[1]
    UNION
    SELECT seller_id FROM conversations WHERE id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Users can view attachments in their conversations"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'message-attachments' AND
  auth.uid() IN (
    SELECT buyer_id FROM conversations WHERE id::text = (storage.foldername(name))[1]
    UNION
    SELECT seller_id FROM conversations WHERE id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Users can delete their own attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'message-attachments' AND
  auth.uid() IN (
    SELECT buyer_id FROM conversations WHERE id::text = (storage.foldername(name))[1]
    UNION
    SELECT seller_id FROM conversations WHERE id::text = (storage.foldername(name))[1]
  )
);

-- Add metadata column to messages for attachments tracking
ALTER TABLE messages ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN messages.metadata IS 'Stores message metadata including attachments array with file info';