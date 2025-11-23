-- Create trade_chat_messages table for real-time chat
CREATE TABLE IF NOT EXISTS public.trade_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_offer_id UUID NOT NULL REFERENCES public.trade_offers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read BOOLEAN DEFAULT FALSE
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_trade_chat_messages_trade_offer ON public.trade_chat_messages(trade_offer_id, created_at);
CREATE INDEX IF NOT EXISTS idx_trade_chat_messages_user ON public.trade_chat_messages(user_id);

-- Enable RLS
ALTER TABLE public.trade_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trade_chat_messages
CREATE POLICY "Users can view chat messages for their trades"
  ON public.trade_chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trade_offers
      WHERE trade_offers.id = trade_chat_messages.trade_offer_id
      AND (trade_offers.buyer_id = auth.uid() OR trade_offers.seller_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in their trades"
  ON public.trade_chat_messages
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.trade_offers
      WHERE trade_offers.id = trade_chat_messages.trade_offer_id
      AND (trade_offers.buyer_id = auth.uid() OR trade_offers.seller_id = auth.uid())
    )
  );

-- Enable realtime for trade_chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.trade_chat_messages;