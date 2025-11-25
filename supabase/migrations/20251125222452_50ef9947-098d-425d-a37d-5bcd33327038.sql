-- Create database function for atomic trade acceptance
CREATE OR REPLACE FUNCTION accept_trade_offer(
  p_offer_id UUID,
  p_cash_amount NUMERIC
) RETURNS VOID AS $$
DECLARE
  v_target_listing_id UUID;
  v_trade_items JSONB;
  v_item JSONB;
BEGIN
  -- Start transaction (implicit in function)
  
  -- Lock the offer row
  SELECT target_listing_id, trade_items
  INTO v_target_listing_id, v_trade_items
  FROM trade_offers
  WHERE id = p_offer_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Offer not found';
  END IF;
  
  -- Update offer status with escrow if needed
  IF p_cash_amount > 0 THEN
    UPDATE trade_offers
    SET status = 'accepted',
        escrow_enabled = true,
        escrow_amount = p_cash_amount
    WHERE id = p_offer_id;
  ELSE
    UPDATE trade_offers
    SET status = 'accepted'
    WHERE id = p_offer_id;
  END IF;
  
  -- Mark target listing as sold
  UPDATE listings
  SET status = 'sold'
  WHERE id = v_target_listing_id;
  
  -- Mark trade items as sold
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_trade_items)
  LOOP
    IF v_item->>'listing_id' IS NOT NULL THEN
      UPDATE listings
      SET status = 'sold'
      WHERE id = (v_item->>'listing_id')::UUID;
    END IF;
  END LOOP;
  
  -- Function commits automatically on success
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;