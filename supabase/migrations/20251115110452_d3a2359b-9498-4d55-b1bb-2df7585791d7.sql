-- Create disputes table for buyer protection and seller appeals
CREATE TABLE public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dispute_type text NOT NULL CHECK (dispute_type IN ('item_not_received', 'item_not_as_described', 'damaged', 'counterfeit', 'other')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved', 'closed', 'escalated')),
  reason text NOT NULL,
  buyer_evidence jsonb DEFAULT '[]'::jsonb,
  seller_response text,
  seller_evidence jsonb DEFAULT '[]'::jsonb,
  admin_notes text,
  resolution text,
  resolved_by uuid REFERENCES public.profiles(id),
  resolved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create ratings table for buyer and seller reviews
CREATE TABLE public.ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  review_type text NOT NULL CHECK (review_type IN ('buyer_to_seller', 'seller_to_buyer')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(order_id, reviewer_id, review_type)
);

-- Create reports table for moderation
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_listing_id uuid REFERENCES public.listings(id) ON DELETE CASCADE,
  report_type text NOT NULL CHECK (report_type IN ('spam', 'inappropriate', 'counterfeit', 'harassment', 'fraud', 'other')),
  reason text NOT NULL,
  evidence jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'resolved', 'dismissed')),
  admin_notes text,
  resolved_by uuid REFERENCES public.profiles(id),
  resolved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create shipping_details table for tracking
CREATE TABLE public.shipping_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  carrier text,
  tracking_number text,
  label_url text,
  shipped_at timestamp with time zone,
  delivered_at timestamp with time zone,
  estimated_delivery timestamp with time zone,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'label_created', 'shipped', 'in_transit', 'delivered', 'failed')),
  tracking_events jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create bundles table for grouped listings
CREATE TABLE public.bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  discount_percentage integer CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  total_price numeric NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'cancelled')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create bundle_items junction table
CREATE TABLE public.bundle_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id uuid NOT NULL REFERENCES public.bundles(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(bundle_id, listing_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bundle_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for disputes
CREATE POLICY "Users can view disputes they're involved in"
  ON public.disputes FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Buyers can create disputes"
  ON public.disputes FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Parties can update their disputes"
  ON public.disputes FOR UPDATE
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- RLS Policies for ratings
CREATE POLICY "Users can view ratings for their orders"
  ON public.ratings FOR SELECT
  USING (auth.uid() = reviewer_id OR auth.uid() = reviewee_id);

CREATE POLICY "Users can create ratings for completed orders"
  ON public.ratings FOR INSERT
  WITH CHECK (
    auth.uid() = reviewer_id AND
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_id
      AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
      AND orders.status = 'completed'
    )
  );

-- RLS Policies for reports
CREATE POLICY "Users can view their own reports"
  ON public.reports FOR SELECT
  USING (auth.uid() = reporter_id);

CREATE POLICY "Users can create reports"
  ON public.reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- RLS Policies for shipping_details
CREATE POLICY "Users can view shipping for their orders"
  ON public.shipping_details FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_id
      AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
    )
  );

-- RLS Policies for bundles
CREATE POLICY "Active bundles are viewable by everyone"
  ON public.bundles FOR SELECT
  USING (status = 'active' OR seller_id = auth.uid());

CREATE POLICY "Sellers can create bundles"
  ON public.bundles FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their own bundles"
  ON public.bundles FOR UPDATE
  USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete their own bundles"
  ON public.bundles FOR DELETE
  USING (auth.uid() = seller_id);

-- RLS Policies for bundle_items
CREATE POLICY "Bundle items visible with bundle"
  ON public.bundle_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bundles
      WHERE bundles.id = bundle_id
      AND (bundles.status = 'active' OR bundles.seller_id = auth.uid())
    )
  );

CREATE POLICY "Sellers can manage their bundle items"
  ON public.bundle_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.bundles
      WHERE bundles.id = bundle_id
      AND bundles.seller_id = auth.uid()
    )
  );

-- Create triggers for updated_at
CREATE TRIGGER update_disputes_updated_at
  BEFORE UPDATE ON public.disputes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_ratings_updated_at
  BEFORE UPDATE ON public.ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_shipping_details_updated_at
  BEFORE UPDATE ON public.shipping_details
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_bundles_updated_at
  BEFORE UPDATE ON public.bundles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Create indexes for performance
CREATE INDEX idx_disputes_buyer_id ON public.disputes(buyer_id);
CREATE INDEX idx_disputes_seller_id ON public.disputes(seller_id);
CREATE INDEX idx_disputes_order_id ON public.disputes(order_id);
CREATE INDEX idx_disputes_status ON public.disputes(status);

CREATE INDEX idx_ratings_reviewee_id ON public.ratings(reviewee_id);
CREATE INDEX idx_ratings_order_id ON public.ratings(order_id);

CREATE INDEX idx_reports_reported_user_id ON public.reports(reported_user_id);
CREATE INDEX idx_reports_reported_listing_id ON public.reports(reported_listing_id);
CREATE INDEX idx_reports_status ON public.reports(status);

CREATE INDEX idx_shipping_order_id ON public.shipping_details(order_id);

CREATE INDEX idx_bundles_seller_id ON public.bundles(seller_id);
CREATE INDEX idx_bundles_status ON public.bundles(status);
CREATE INDEX idx_bundle_items_listing_id ON public.bundle_items(listing_id);