-- Create wallet_withdrawals table
CREATE TABLE IF NOT EXISTS public.wallet_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.wallet_accounts(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'GBP',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  bank_account_id TEXT NOT NULL,
  stripe_payout_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT
);

-- Enable RLS
ALTER TABLE public.wallet_withdrawals ENABLE ROW LEVEL SECURITY;

-- Users can view their own withdrawals
CREATE POLICY "Users can view own withdrawals"
  ON public.wallet_withdrawals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.wallet_accounts
      WHERE wallet_accounts.id = wallet_withdrawals.wallet_id
      AND wallet_accounts.user_id = auth.uid()
    )
  );

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_wallet_withdrawals_wallet_id ON public.wallet_withdrawals(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_withdrawals_stripe_payout ON public.wallet_withdrawals(stripe_payout_id);