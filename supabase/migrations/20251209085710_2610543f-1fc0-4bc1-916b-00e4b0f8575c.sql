-- Update the admin function to also handle listing_variants FK
CREATE OR REPLACE FUNCTION admin_delete_cards_by_card_id(card_ids_to_delete TEXT[])
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- First, update listings that reference these cards
  UPDATE listings 
  SET card_id = NULL 
  WHERE card_id = ANY(card_ids_to_delete);
  
  -- Update listing_variants that reference these cards
  UPDATE listing_variants 
  SET card_id = NULL 
  WHERE card_id = ANY(card_ids_to_delete);
  
  -- Update trade_market_trends
  UPDATE trade_market_trends 
  SET card_id = NULL 
  WHERE card_id = ANY(card_ids_to_delete);
  
  -- Now delete the cards
  DELETE FROM pokemon_card_attributes 
  WHERE card_id = ANY(card_ids_to_delete);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN json_build_object(
    'deleted', deleted_count,
    'requested', array_length(card_ids_to_delete, 1)
  );
END;
$$;