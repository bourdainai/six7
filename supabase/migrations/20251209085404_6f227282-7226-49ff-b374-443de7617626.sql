-- Create an admin function to delete cards by ID, bypassing RLS
CREATE OR REPLACE FUNCTION admin_delete_cards_by_card_id(card_ids_to_delete TEXT[])
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- First, update any listings that reference these cards
  UPDATE listings 
  SET card_id = NULL 
  WHERE card_id = ANY(card_ids_to_delete);
  
  -- Also update listing_variants that reference these cards
  UPDATE listing_variants 
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION admin_delete_cards_by_card_id(TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_cards_by_card_id(TEXT[]) TO service_role;