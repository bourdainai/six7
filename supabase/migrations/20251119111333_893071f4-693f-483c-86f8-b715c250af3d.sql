-- Fix critical wallet RLS security issues
-- Remove overly permissive policies that allow any authenticated user to access/modify any wallet

-- Drop dangerous policies on wallet_accounts
DROP POLICY IF EXISTS "System can manage wallets" ON wallet_accounts;

-- Drop dangerous policies on wallet_transactions  
DROP POLICY IF EXISTS "System can manage transactions" ON wallet_transactions;

-- Add secure read-only policy for wallet_accounts
CREATE POLICY "Users can view their own wallet"
ON wallet_accounts FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Add secure read-only policy for wallet_transactions
CREATE POLICY "Users can view their own transactions"
ON wallet_transactions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM wallet_accounts
    WHERE wallet_accounts.id = wallet_transactions.wallet_id
    AND wallet_accounts.user_id = auth.uid()
  )
);

-- Note: Wallet modifications should only happen via edge functions using SERVICE_ROLE_KEY
-- Edge functions bypass RLS, so no INSERT/UPDATE/DELETE policies are needed for authenticated users