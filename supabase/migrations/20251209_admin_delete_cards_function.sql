-- Create an admin function to delete cards by ID, bypassing RLS
-- This is needed because the cleanup function may be blocked by RLS policies

CREATE OR REPLACE FUNCTION admin_delete_cards(card_ids_to_delete UUID[])
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- Run as the function owner (bypasses RLS)
AS $$
DECLARE
  deleted_count INTEGER := 0;
  failed_ids UUID[] := ARRAY[]::UUID[];
  card_id_val UUID;
BEGIN
  -- First, try to update any listings that reference these cards
  -- This handles the foreign key constraint
  UPDATE listings 
  SET card_id = NULL 
  WHERE card_id IN (
    SELECT pca.card_id 
    FROM pokemon_card_attributes pca 
    WHERE pca.id = ANY(card_ids_to_delete)
  );
  
  -- Also update trade_market_trends
  UPDATE trade_market_trends 
  SET card_id = NULL 
  WHERE card_id IN (
    SELECT pca.card_id 
    FROM pokemon_card_attributes pca 
    WHERE pca.id = ANY(card_ids_to_delete)
  );
  
  -- Now delete the cards
  DELETE FROM pokemon_card_attributes 
  WHERE id = ANY(card_ids_to_delete);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN json_build_object(
    'deleted', deleted_count,
    'requested', array_length(card_ids_to_delete, 1)
  );
END;
$$;

-- Also create a version that deletes by card_id (string)
CREATE OR REPLACE FUNCTION admin_delete_cards_by_card_id(card_ids_to_delete TEXT[])
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- First, update any listings that reference these cards
  UPDATE listings 
  SET card_id = NULL 
  WHERE card_id = ANY(card_ids_to_delete);
  
  -- Also update trade_market_trends
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

-- Grant execute to authenticated users (the Edge Function runs as authenticated)
GRANT EXECUTE ON FUNCTION admin_delete_cards(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_cards(UUID[]) TO service_role;
GRANT EXECUTE ON FUNCTION admin_delete_cards_by_card_id(TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_cards_by_card_id(TEXT[]) TO service_role;

