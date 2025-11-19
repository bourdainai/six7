-- Create wallet_accounts table
CREATE TABLE IF NOT EXISTS wallet_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL, -- Using auth.users instead of profiles for stricter FK if possible, or profiles if that's the pattern
  balance DECIMAL(10,2) DEFAULT 0.00 CHECK (balance >= 0),
  pending_balance DECIMAL(10,2) DEFAULT 0.00 CHECK (pending_balance >= 0),
  lifetime_deposits DECIMAL(10,2) DEFAULT 0.00,
  lifetime_withdrawals DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_accounts_user_id ON wallet_accounts(user_id);

-- Create wallet_transactions table
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID REFERENCES wallet_accounts(id) NOT NULL,
  type VARCHAR(50) NOT NULL, -- deposit, withdrawal, purchase, sale, transfer_in, transfer_out
  amount DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  related_user_id UUID, -- Can reference auth.users or profiles
  related_order_id UUID, -- Can reference orders(id) if exists
  stripe_transaction_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'completed',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_created ON wallet_transactions(wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON wallet_transactions(type);

-- Create wallet_deposits table
CREATE TABLE IF NOT EXISTS wallet_deposits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID REFERENCES wallet_accounts(id) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  stripe_payment_intent_id VARCHAR(255) UNIQUE,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create wallet_withdrawals table
CREATE TABLE IF NOT EXISTS wallet_withdrawals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID REFERENCES wallet_accounts(id) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  bank_account_id VARCHAR(255),
  stripe_transfer_id VARCHAR(255) UNIQUE,
  status VARCHAR(50) DEFAULT 'pending',
  initiated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create wallet_settlements table
CREATE TABLE IF NOT EXISTS wallet_settlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_wallet_id UUID REFERENCES wallet_accounts(id) NOT NULL,
  order_id UUID, -- REFERENCES orders(id)
  amount DECIMAL(10,2) NOT NULL,
  fee_amount DECIMAL(10,2) NOT NULL,
  net_amount DECIMAL(10,2) NOT NULL,
  hold_until TIMESTAMP WITH TIME ZONE NOT NULL,
  released_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE wallet_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_settlements ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can see their own wallet
CREATE POLICY "Users can view their own wallet" 
  ON wallet_accounts FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can see their own transactions
CREATE POLICY "Users can view their own transactions" 
  ON wallet_transactions FOR SELECT 
  USING (wallet_id IN (SELECT id FROM wallet_accounts WHERE user_id = auth.uid()));

-- Users can see their own deposits
CREATE POLICY "Users can view their own deposits" 
  ON wallet_deposits FOR SELECT 
  USING (wallet_id IN (SELECT id FROM wallet_accounts WHERE user_id = auth.uid()));

-- Users can see their own withdrawals
CREATE POLICY "Users can view their own withdrawals" 
  ON wallet_withdrawals FOR SELECT 
  USING (wallet_id IN (SELECT id FROM wallet_accounts WHERE user_id = auth.uid()));

-- Settlements viewable by seller
CREATE POLICY "Sellers can view their settlements" 
  ON wallet_settlements FOR SELECT 
  USING (seller_wallet_id IN (SELECT id FROM wallet_accounts WHERE user_id = auth.uid()));

-- Only service role can modify these tables (controlled via Edge Functions)

