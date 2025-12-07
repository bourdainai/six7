-- Create atomic wallet transfer function to prevent race conditions
CREATE OR REPLACE FUNCTION public.transfer_funds(
  p_sender_id UUID,
  p_recipient_id UUID,
  p_amount NUMERIC,
  p_description TEXT DEFAULT 'Transfer'
) RETURNS TABLE(
  success BOOLEAN,
  sender_balance_after NUMERIC,
  recipient_balance_after NUMERIC,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_wallet_id UUID;
  v_recipient_wallet_id UUID;
  v_sender_balance NUMERIC;
  v_recipient_balance NUMERIC;
  v_sender_new_balance NUMERIC;
  v_recipient_new_balance NUMERIC;
BEGIN
  -- Validate amount
  IF p_amount <= 0 THEN
    RETURN QUERY SELECT false, NULL::NUMERIC, NULL::NUMERIC, 'Amount must be positive'::TEXT;
    RETURN;
  END IF;
  
  -- Prevent self-transfer
  IF p_sender_id = p_recipient_id THEN
    RETURN QUERY SELECT false, NULL::NUMERIC, NULL::NUMERIC, 'Cannot transfer to self'::TEXT;
    RETURN;
  END IF;

  -- Lock sender wallet row first (prevents race conditions)
  SELECT id, balance INTO v_sender_wallet_id, v_sender_balance
  FROM wallet_accounts
  WHERE user_id = p_sender_id
  FOR UPDATE;
  
  IF v_sender_wallet_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::NUMERIC, NULL::NUMERIC, 'Sender wallet not found'::TEXT;
    RETURN;
  END IF;
  
  IF v_sender_balance < p_amount THEN
    RETURN QUERY SELECT false, v_sender_balance, NULL::NUMERIC, 'Insufficient funds'::TEXT;
    RETURN;
  END IF;
  
  -- Lock recipient wallet row
  SELECT id, balance INTO v_recipient_wallet_id, v_recipient_balance
  FROM wallet_accounts
  WHERE user_id = p_recipient_id
  FOR UPDATE;
  
  IF v_recipient_wallet_id IS NULL THEN
    RETURN QUERY SELECT false, v_sender_balance, NULL::NUMERIC, 'Recipient wallet not found'::TEXT;
    RETURN;
  END IF;
  
  -- Calculate new balances
  v_sender_new_balance := v_sender_balance - p_amount;
  v_recipient_new_balance := v_recipient_balance + p_amount;
  
  -- Atomic updates
  UPDATE wallet_accounts SET balance = v_sender_new_balance WHERE id = v_sender_wallet_id;
  UPDATE wallet_accounts SET balance = v_recipient_new_balance WHERE id = v_recipient_wallet_id;
  
  -- Log transactions
  INSERT INTO wallet_transactions (wallet_id, type, amount, balance_after, related_user_id, description, status)
  VALUES 
    (v_sender_wallet_id, 'transfer_out', -p_amount, v_sender_new_balance, p_recipient_id, p_description, 'completed'),
    (v_recipient_wallet_id, 'transfer_in', p_amount, v_recipient_new_balance, p_sender_id, p_description, 'completed');
  
  RETURN QUERY SELECT true, v_sender_new_balance, v_recipient_new_balance, NULL::TEXT;
END;
$$;