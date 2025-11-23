-- Create shipping_presets table for sellers to save shipping templates
CREATE TABLE IF NOT EXISTS public.shipping_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  default_carrier TEXT,
  default_shipping_method_id TEXT,
  default_service_point_id TEXT,
  default_package_type TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create returns table to track return requests
CREATE TABLE IF NOT EXISTS public.returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'in_transit', 'received', 'refunded')),
  tracking_number TEXT,
  refund_amount DECIMAL(10,2),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shipping_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shipping_presets
CREATE POLICY "Sellers can view their own presets"
  ON public.shipping_presets
  FOR SELECT
  USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can create their own presets"
  ON public.shipping_presets
  FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their own presets"
  ON public.shipping_presets
  FOR UPDATE
  USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete their own presets"
  ON public.shipping_presets
  FOR DELETE
  USING (auth.uid() = seller_id);

-- RLS Policies for returns
CREATE POLICY "Users can view their own returns"
  ON public.returns
  FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Buyers can create returns for their orders"
  ON public.returns
  FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Sellers can update return status"
  ON public.returns
  FOR UPDATE
  USING (auth.uid() = seller_id);

-- Indexes
CREATE INDEX idx_shipping_presets_seller ON public.shipping_presets(seller_id);
CREATE INDEX idx_returns_order ON public.returns(order_id);
CREATE INDEX idx_returns_buyer ON public.returns(buyer_id);
CREATE INDEX idx_returns_seller ON public.returns(seller_id);
CREATE INDEX idx_returns_status ON public.returns(status);

-- Update timestamp trigger for presets
CREATE TRIGGER update_shipping_presets_timestamp
  BEFORE UPDATE ON public.shipping_presets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Update timestamp trigger for returns
CREATE TRIGGER update_returns_timestamp
  BEFORE UPDATE ON public.returns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();