-- 1. Add Trading Card Columns to listings
ALTER TABLE listings 
  ADD COLUMN IF NOT EXISTS card_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS set_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS trade_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS video_url TEXT;

-- 2. Create pokemon_card_attributes table
CREATE TABLE IF NOT EXISTS pokemon_card_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  set_name VARCHAR(255) NOT NULL,
  images JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Ensure wallet_accounts table exists with all fields
CREATE TABLE IF NOT EXISTS wallet_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  balance DECIMAL(10,2) DEFAULT 0.00 CHECK (balance >= 0),
  pending_balance DECIMAL(10,2) DEFAULT 0.00 CHECK (pending_balance >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Ensure wallet_transactions table exists with all fields
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES wallet_accounts(id) ON DELETE CASCADE NOT NULL,
  type VARCHAR(50) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'completed',
  description TEXT,
  related_order_id UUID,
  related_user_id UUID,
  stripe_transaction_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Ensure trade_offers table exists with all fields
CREATE TABLE IF NOT EXISTS trade_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  target_listing_id UUID REFERENCES listings(id) ON DELETE CASCADE NOT NULL,
  cash_amount DECIMAL(10,2) DEFAULT 0.00,
  trade_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  trade_item_valuations JSONB,
  photos JSONB,
  ai_fairness_score DECIMAL(3,2),
  status VARCHAR(50) DEFAULT 'pending',
  expiry_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE pokemon_card_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_offers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pokemon_card_attributes (public read)
DROP POLICY IF EXISTS "Pokemon cards viewable by everyone" ON pokemon_card_attributes;
CREATE POLICY "Pokemon cards viewable by everyone" 
  ON pokemon_card_attributes FOR SELECT 
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "System can manage pokemon cards" ON pokemon_card_attributes;
CREATE POLICY "System can manage pokemon cards" 
  ON pokemon_card_attributes FOR ALL 
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for wallet_accounts (users can only see their own)
DROP POLICY IF EXISTS "Users can view own wallet" ON wallet_accounts;
CREATE POLICY "Users can view own wallet" 
  ON wallet_accounts FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can manage wallets" ON wallet_accounts;
CREATE POLICY "System can manage wallets" 
  ON wallet_accounts FOR ALL 
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for wallet_transactions (users can only see their own)
DROP POLICY IF EXISTS "Users can view own transactions" ON wallet_transactions;
CREATE POLICY "Users can view own transactions" 
  ON wallet_transactions FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wallet_accounts 
      WHERE wallet_accounts.id = wallet_transactions.wallet_id 
      AND wallet_accounts.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "System can manage transactions" ON wallet_transactions;
CREATE POLICY "System can manage transactions" 
  ON wallet_transactions FOR ALL 
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for trade_offers (users can see offers they're involved in)
DROP POLICY IF EXISTS "Users can view their trade offers" ON trade_offers;
CREATE POLICY "Users can view their trade offers" 
  ON trade_offers FOR SELECT 
  TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

DROP POLICY IF EXISTS "Users can create trade offers" ON trade_offers;
CREATE POLICY "Users can create trade offers" 
  ON trade_offers FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Users can update their trade offers" ON trade_offers;
CREATE POLICY "Users can update their trade offers" 
  ON trade_offers FOR UPDATE 
  TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);