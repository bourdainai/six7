-- Phase 2: Enhanced Offer System and Analytics Tables

-- Add counter_offer_to field to track offer chains
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS counter_offer_to uuid REFERENCES public.offers(id);

-- Add offer analytics/history tracking
CREATE TABLE IF NOT EXISTS public.offer_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  action text NOT NULL, -- 'created', 'accepted', 'rejected', 'countered', 'expired'
  actor_id uuid NOT NULL,
  previous_amount numeric,
  new_amount numeric,
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on offer_history
ALTER TABLE public.offer_history ENABLE ROW LEVEL SECURITY;

-- Offer history visible to parties involved
CREATE POLICY "Users can view offer history for their offers"
  ON public.offer_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.offers
      WHERE offers.id = offer_history.offer_id
      AND (offers.buyer_id = auth.uid() OR offers.seller_id = auth.uid())
    )
  );

-- System can insert offer history
CREATE POLICY "System can insert offer history"
  ON public.offer_history
  FOR INSERT
  WITH CHECK (true);

-- Add index for offer history queries
CREATE INDEX IF NOT EXISTS idx_offer_history_offer_id ON public.offer_history(offer_id);
CREATE INDEX IF NOT EXISTS idx_offer_history_created_at ON public.offer_history(created_at DESC);

-- Create seller analytics aggregation table
CREATE TABLE IF NOT EXISTS public.seller_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  total_revenue numeric DEFAULT 0,
  total_sales integer DEFAULT 0,
  total_views integer DEFAULT 0,
  total_saves integer DEFAULT 0,
  total_messages integer DEFAULT 0,
  conversion_rate numeric DEFAULT 0,
  avg_sale_price numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(seller_id, date)
);

-- Enable RLS on seller_analytics
ALTER TABLE public.seller_analytics ENABLE ROW LEVEL SECURITY;

-- Sellers can view their own analytics
CREATE POLICY "Sellers can view their own analytics"
  ON public.seller_analytics
  FOR SELECT
  USING (auth.uid() = seller_id);

-- System can insert/update analytics
CREATE POLICY "System can manage seller analytics"
  ON public.seller_analytics
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_seller_analytics_seller_date ON public.seller_analytics(seller_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_seller_analytics_date ON public.seller_analytics(date DESC);

-- Add shipping address validation status
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS address_validated boolean DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS address_validation_details jsonb DEFAULT '{}'::jsonb;