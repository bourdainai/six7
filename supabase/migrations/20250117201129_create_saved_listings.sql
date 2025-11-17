-- Create saved_listings table for user wishlist
CREATE TABLE IF NOT EXISTS public.saved_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, listing_id)
);

-- Enable RLS
ALTER TABLE public.saved_listings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for saved_listings
CREATE POLICY "Users can view their own saved listings"
  ON public.saved_listings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved listings"
  ON public.saved_listings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved listings"
  ON public.saved_listings FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for faster queries
CREATE INDEX idx_saved_listings_user_id ON public.saved_listings(user_id);
CREATE INDEX idx_saved_listings_listing_id ON public.saved_listings(listing_id);
CREATE INDEX idx_saved_listings_created_at ON public.saved_listings(created_at DESC);

-- Create function to update saves counter on listings
CREATE OR REPLACE FUNCTION update_listing_saves_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.listings
    SET saves = COALESCE(saves, 0) + 1
    WHERE id = NEW.listing_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.listings
    SET saves = GREATEST(COALESCE(saves, 0) - 1, 0)
    WHERE id = OLD.listing_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update saves counter
CREATE TRIGGER update_listing_saves_on_save
  AFTER INSERT OR DELETE ON public.saved_listings
  FOR EACH ROW
  EXECUTE FUNCTION update_listing_saves_count();

