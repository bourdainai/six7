-- Create wallet_deposits table
CREATE TABLE IF NOT EXISTS public.wallet_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.wallet_accounts(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'GBP',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT
);

-- Enable RLS
ALTER TABLE public.wallet_deposits ENABLE ROW LEVEL SECURITY;

-- Users can view their own deposits
CREATE POLICY "Users can view own deposits"
  ON public.wallet_deposits
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.wallet_accounts
      WHERE wallet_accounts.id = wallet_deposits.wallet_id
      AND wallet_accounts.user_id = auth.uid()
    )
  );

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_wallet_deposits_wallet_id ON public.wallet_deposits(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_deposits_stripe_pi ON public.wallet_deposits(stripe_payment_intent_id);

-- Add foreign key constraint to wallet_transactions if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'wallet_transactions_wallet_id_fkey'
  ) THEN
    ALTER TABLE public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_wallet_id_fkey
    FOREIGN KEY (wallet_id) REFERENCES public.wallet_accounts(id) ON DELETE CASCADE;
  END IF;
END $$;