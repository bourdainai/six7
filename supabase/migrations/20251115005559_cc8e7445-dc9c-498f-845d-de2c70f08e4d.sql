-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('buyer', 'seller', 'admin', 'moderator');

-- Create enum for listing status
CREATE TYPE public.listing_status AS ENUM ('draft', 'pending_review', 'active', 'reserved', 'sold', 'cancelled', 'disputed');

-- Create enum for listing condition
CREATE TYPE public.condition_type AS ENUM ('new_with_tags', 'like_new', 'excellent', 'good', 'fair');

-- Profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  country TEXT DEFAULT 'US',
  trust_score INTEGER DEFAULT 50 CHECK (trust_score >= 0 AND trust_score <= 100),
  kyc_status BOOLEAN DEFAULT FALSE,
  is_banned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User roles table (many-to-many)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role user_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- User preferences for buyers
CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  sizes JSONB DEFAULT '[]'::jsonb,
  brands JSONB DEFAULT '[]'::jsonb,
  categories JSONB DEFAULT '[]'::jsonb,
  colors JSONB DEFAULT '[]'::jsonb,
  style_tags JSONB DEFAULT '[]'::jsonb,
  budget_min DECIMAL(10,2),
  budget_max DECIMAL(10,2),
  distance_radius INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Listings table
CREATE TABLE public.listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Core item data
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  subcategory TEXT,
  brand TEXT,
  size TEXT,
  color TEXT,
  material TEXT,
  condition condition_type,
  
  -- Pricing
  original_rrp DECIMAL(10,2),
  seller_price DECIMAL(10,2) NOT NULL,
  suggested_price DECIMAL(10,2),
  quick_sale_price DECIMAL(10,2),
  ambitious_price DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  
  -- AI derived data
  ai_confidence JSONB DEFAULT '{}'::jsonb,
  style_tags JSONB DEFAULT '[]'::jsonb,
  embedding_id TEXT,
  
  -- Status
  status listing_status DEFAULT 'draft',
  views INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

-- Listing images table
CREATE TABLE public.listing_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  ai_analysis JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_images ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- User roles policies
CREATE POLICY "User roles are viewable by everyone"
  ON public.user_roles FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert user roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- User preferences policies
CREATE POLICY "Users can view own preferences"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON public.user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON public.user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Listings policies
CREATE POLICY "Published listings are viewable by everyone"
  ON public.listings FOR SELECT
  USING (status = 'active' OR auth.uid() = seller_id);

CREATE POLICY "Sellers can insert own listings"
  ON public.listings FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update own listings"
  ON public.listings FOR UPDATE
  USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete own listings"
  ON public.listings FOR DELETE
  USING (auth.uid() = seller_id);

-- Listing images policies
CREATE POLICY "Images visible with listing visibility"
  ON public.listing_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.listings
      WHERE listings.id = listing_images.listing_id
      AND (listings.status = 'active' OR listings.seller_id = auth.uid())
    )
  );

CREATE POLICY "Sellers can insert images for own listings"
  ON public.listing_images FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.listings
      WHERE listings.id = listing_images.listing_id
      AND listings.seller_id = auth.uid()
    )
  );

CREATE POLICY "Sellers can delete images from own listings"
  ON public.listing_images FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.listings
      WHERE listings.id = listing_images.listing_id
      AND listings.seller_id = auth.uid()
    )
  );

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  -- Add default seller and buyer roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'seller'), (NEW.id, 'buyer');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_listings_updated_at
  BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Create indexes for performance
CREATE INDEX idx_listings_seller_id ON public.listings(seller_id);
CREATE INDEX idx_listings_status ON public.listings(status);
CREATE INDEX idx_listings_created_at ON public.listings(created_at DESC);
CREATE INDEX idx_listing_images_listing_id ON public.listing_images(listing_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);