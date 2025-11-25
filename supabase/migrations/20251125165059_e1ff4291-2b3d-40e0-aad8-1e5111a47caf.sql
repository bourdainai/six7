-- Add preferred_currency to profiles if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'preferred_currency'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN preferred_currency TEXT DEFAULT 'GBP' CHECK (preferred_currency IN ('GBP', 'USD', 'EUR'));
  END IF;
END $$;

-- Add country column to profiles to track user region
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'country'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN country TEXT;
  END IF;
END $$;