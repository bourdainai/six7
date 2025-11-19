-- Fix storage bucket policies to verify image ownership
-- Replace overly permissive policies with ownership checks

-- Drop insecure policies
DROP POLICY IF EXISTS "Users can update their own listing images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own listing images" ON storage.objects;

-- Create secure policies that verify user owns the path
-- Images must be stored in {user_id}/{listing_id}/{filename} structure

CREATE POLICY "Users can update images in their own folder"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'listing-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete images in their own folder"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'listing-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can insert images in their own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'listing-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);