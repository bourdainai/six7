-- Add composite unique constraint to prevent duplicate cards
-- This ensures only ONE card per (set_code, number) combination
-- Run this AFTER cleaning up existing duplicates with the cleanup-duplicates function

-- First, check if there are any remaining duplicates
DO $$
DECLARE
  dup_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO dup_count
  FROM (
    SELECT set_code, number, COUNT(*) as cnt
    FROM pokemon_card_attributes
    GROUP BY set_code, number
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF dup_count > 0 THEN
    RAISE NOTICE 'Warning: % duplicate groups found. Clean up duplicates before adding constraint.', dup_count;
    -- Don't raise exception - let it continue but warn
  ELSE
    RAISE NOTICE 'No duplicates found. Safe to add constraint.';
  END IF;
END $$;

-- Create the unique index (will fail if duplicates exist)
-- Using CREATE INDEX IF NOT EXISTS to be idempotent
CREATE UNIQUE INDEX IF NOT EXISTS idx_pokemon_card_unique_set_number 
ON pokemon_card_attributes(set_code, number);

-- Add a comment explaining the constraint
COMMENT ON INDEX idx_pokemon_card_unique_set_number IS 
'Prevents duplicate cards - only one card per (set_code, number) combination allowed';

