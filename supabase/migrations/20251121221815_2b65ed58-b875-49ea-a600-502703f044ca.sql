-- Add github to sync_source_type enum if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'github' AND enumtypid = 'sync_source_type'::regtype) THEN
        ALTER TYPE sync_source_type ADD VALUE 'github';
    END IF;
END $$;