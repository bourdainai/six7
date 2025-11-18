-- Add notification_preferences column to profiles table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'notification_preferences'
  ) THEN
    ALTER TABLE profiles 
    ADD COLUMN notification_preferences JSONB DEFAULT '{
      "email_enabled": true,
      "push_enabled": true,
      "email_order_confirmation": true,
      "email_payment_received": true,
      "email_shipping_update": true,
      "email_new_message": true,
      "email_price_drop": true,
      "email_offer_update": true,
      "email_review_request": true,
      "email_order_delivered": true,
      "email_payout_completed": true,
      "email_listing_published": true,
      "email_dispute_created": true
    }'::jsonb;
    
    -- Add comment
    COMMENT ON COLUMN profiles.notification_preferences IS 'User notification preferences for email and push notifications';
  END IF;
END $$;
