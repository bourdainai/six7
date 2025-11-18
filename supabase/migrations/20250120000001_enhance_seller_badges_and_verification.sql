-- Enhance seller badges and verification system

-- Create enum for badge types
DO $$ BEGIN
  CREATE TYPE badge_type AS ENUM (
    'verified_seller',
    'top_seller',
    'fast_shipper',
    'excellent_rating',
    'trusted_seller',
    'new_seller',
    'power_seller',
    'verified_business',
    'email_verified',
    'phone_verified',
    'id_verified',
    'stripe_verified'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create enum for verification status
DO $$ BEGIN
  CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected', 'expired');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Enhance seller_badges table if it doesn't exist or add missing columns
DO $$ 
BEGIN
  -- Check if seller_badges table exists
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'seller_badges') THEN
    CREATE TABLE public.seller_badges (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      badge_type TEXT NOT NULL,
      badge_name TEXT NOT NULL,
      description TEXT,
      icon_url TEXT,
      earned_at TIMESTAMPTZ DEFAULT NOW(),
      expires_at TIMESTAMPTZ,
      is_active BOOLEAN DEFAULT TRUE,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(seller_id, badge_type)
    );
  ELSE
    -- Add missing columns if table exists
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'seller_badges' AND column_name = 'description') THEN
      ALTER TABLE public.seller_badges ADD COLUMN description TEXT;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'seller_badges' AND column_name = 'icon_url') THEN
      ALTER TABLE public.seller_badges ADD COLUMN icon_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'seller_badges' AND column_name = 'expires_at') THEN
      ALTER TABLE public.seller_badges ADD COLUMN expires_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'seller_badges' AND column_name = 'is_active') THEN
      ALTER TABLE public.seller_badges ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'seller_badges' AND column_name = 'metadata') THEN
      ALTER TABLE public.seller_badges ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
  END IF;
END $$;

-- Create seller verifications table
CREATE TABLE IF NOT EXISTS public.seller_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  verification_type TEXT NOT NULL CHECK (verification_type IN ('email', 'phone', 'id', 'business', 'address', 'bank_account')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected', 'expired')),
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  verification_data JSONB DEFAULT '{}'::jsonb,
  verified_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(seller_id, verification_type)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_seller_badges_seller_id ON public.seller_badges(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_badges_type ON public.seller_badges(badge_type);
CREATE INDEX IF NOT EXISTS idx_seller_badges_active ON public.seller_badges(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_seller_verifications_seller_id ON public.seller_verifications(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_verifications_type ON public.seller_verifications(verification_type);
CREATE INDEX IF NOT EXISTS idx_seller_verifications_status ON public.seller_verifications(status);

-- Add verification columns to profiles if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email_verified') THEN
    ALTER TABLE public.profiles ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone_verified') THEN
    ALTER TABLE public.profiles ADD COLUMN phone_verified BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'id_verified') THEN
    ALTER TABLE public.profiles ADD COLUMN id_verified BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'business_verified') THEN
    ALTER TABLE public.profiles ADD COLUMN business_verified BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'verification_level') THEN
    ALTER TABLE public.profiles ADD COLUMN verification_level TEXT DEFAULT 'unverified' CHECK (verification_level IN ('unverified', 'basic', 'verified', 'premium'));
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.seller_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_verifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for seller_badges
DROP POLICY IF EXISTS "Everyone can view seller badges" ON public.seller_badges;
CREATE POLICY "Everyone can view seller badges"
  ON public.seller_badges
  FOR SELECT
  USING (is_active = TRUE);

DROP POLICY IF EXISTS "Sellers can view their own badges" ON public.seller_badges;
CREATE POLICY "Sellers can view their own badges"
  ON public.seller_badges
  FOR SELECT
  USING (auth.uid() = seller_id);

DROP POLICY IF EXISTS "Admins can manage badges" ON public.seller_badges;
CREATE POLICY "Admins can manage badges"
  ON public.seller_badges
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- RLS Policies for seller_verifications
DROP POLICY IF EXISTS "Sellers can view their own verifications" ON public.seller_verifications;
CREATE POLICY "Sellers can view their own verifications"
  ON public.seller_verifications
  FOR SELECT
  USING (auth.uid() = seller_id);

DROP POLICY IF EXISTS "Admins can manage verifications" ON public.seller_verifications;
CREATE POLICY "Admins can manage verifications"
  ON public.seller_verifications
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Function to update verification level based on verifications
CREATE OR REPLACE FUNCTION update_seller_verification_level()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET verification_level = CASE
    WHEN (
      SELECT COUNT(*) FROM public.seller_verifications
      WHERE seller_id = NEW.seller_id
      AND status = 'verified'
      AND verification_type IN ('email', 'phone', 'id')
    ) = 3 THEN 'premium'
    WHEN (
      SELECT COUNT(*) FROM public.seller_verifications
      WHERE seller_id = NEW.seller_id
      AND status = 'verified'
      AND verification_type IN ('email', 'phone')
    ) = 2 THEN 'verified'
    WHEN (
      SELECT COUNT(*) FROM public.seller_verifications
      WHERE seller_id = NEW.seller_id
      AND status = 'verified'
      AND verification_type = 'email'
    ) = 1 THEN 'basic'
    ELSE 'unverified'
  END
  WHERE id = NEW.seller_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update verification level
DROP TRIGGER IF EXISTS trigger_update_verification_level ON public.seller_verifications;
CREATE TRIGGER trigger_update_verification_level
  AFTER INSERT OR UPDATE ON public.seller_verifications
  FOR EACH ROW
  WHEN (NEW.status = 'verified')
  EXECUTE FUNCTION update_seller_verification_level();

-- Comments
COMMENT ON TABLE public.seller_badges IS 'Badges earned by sellers based on performance and verification';
COMMENT ON TABLE public.seller_verifications IS 'Verification records for seller identity and business information';
COMMENT ON COLUMN public.profiles.verification_level IS 'Overall verification level: unverified, basic, verified, premium';
