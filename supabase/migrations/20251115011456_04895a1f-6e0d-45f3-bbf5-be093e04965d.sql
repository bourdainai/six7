-- Add Stripe Connect account ID to profiles
ALTER TABLE profiles 
ADD COLUMN stripe_connect_account_id text,
ADD COLUMN stripe_onboarding_complete boolean DEFAULT false,
ADD COLUMN can_receive_payments boolean DEFAULT false;

-- Create orders table
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  buyer_id uuid NOT NULL REFERENCES profiles(id),
  seller_id uuid NOT NULL REFERENCES profiles(id),
  total_amount numeric NOT NULL,
  platform_fee numeric NOT NULL,
  seller_amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'GBP',
  status text NOT NULL DEFAULT 'pending',
  shipping_address jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create order_items table
CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES listings(id),
  price numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create payments table
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  order_id uuid NOT NULL REFERENCES orders(id),
  stripe_payment_intent_id text NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'GBP',
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create payouts table
CREATE TABLE payouts (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  seller_id uuid NOT NULL REFERENCES profiles(id),
  order_id uuid NOT NULL REFERENCES orders(id),
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'GBP',
  stripe_transfer_id text,
  status text NOT NULL DEFAULT 'pending',
  scheduled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create seller_balances table
CREATE TABLE seller_balances (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  seller_id uuid NOT NULL REFERENCES profiles(id) UNIQUE,
  available_balance numeric NOT NULL DEFAULT 0,
  pending_balance numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'GBP',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_balances ENABLE ROW LEVEL SECURITY;

-- RLS Policies for orders
CREATE POLICY "Users can view their own orders as buyer"
  ON orders FOR SELECT
  USING (auth.uid() = buyer_id);

CREATE POLICY "Users can view their own orders as seller"
  ON orders FOR SELECT
  USING (auth.uid() = seller_id);

CREATE POLICY "Users can create orders as buyer"
  ON orders FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

-- RLS Policies for order_items
CREATE POLICY "Users can view order items for their orders"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
    )
  );

-- RLS Policies for payments
CREATE POLICY "Users can view payments for their orders"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = payments.order_id
      AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
    )
  );

-- RLS Policies for payouts
CREATE POLICY "Sellers can view their own payouts"
  ON payouts FOR SELECT
  USING (auth.uid() = seller_id);

-- RLS Policies for seller_balances
CREATE POLICY "Sellers can view their own balance"
  ON seller_balances FOR SELECT
  USING (auth.uid() = seller_id);

-- Triggers for updated_at
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_seller_balances_updated_at
  BEFORE UPDATE ON seller_balances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();