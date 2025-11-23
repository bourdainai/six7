import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Smile } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface TradeChatProps {
  tradeOfferId: string;
  currentUserId: string;
}

interface ChatMessage {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  user_name?: string;
}

export function TradeChat({ tradeOfferId, currentUserId }: TradeChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel(`trade-chat-${tradeOfferId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trade_chat_messages',
          filter: `trade_offer_id=eq.${tradeOfferId}`
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as ChatMessage]);
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tradeOfferId]);

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from('trade_chat_messages')
      .select(`
        *,
        profiles!user_id (
          full_name
        )
      `)
      .eq('trade_offer_id', tradeOfferId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    setMessages(data.map((msg: any) => ({
      ...msg,
      user_name: msg.profiles?.full_name || 'Anonymous'
    })));
    
    setTimeout(scrollToBottom, 100);
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const { error } = await supabase
      .from('trade_chat_messages')
      .insert({
        trade_offer_id: tradeOfferId,
        user_id: currentUserId,
        message: newMessage.trim()
      });

    if (error) {
      console.error('Error sending message:', error);
      return;
    }

    setNewMessage('');
  };

  const quickMessages = [
    "Would you add another card?",
    "Can you do this for less cash?",
    "This looks good to me!",
    "Let me think about it",
  ];

  return (
    <div className="flex flex-col h-[400px] border rounded-lg">
      <div className="p-3 border-b bg-muted/50">
        <h4 className="font-semibold text-sm">Trade Chat</h4>
        {isTyping && (
          <p className="text-xs text-muted-foreground">Other person is typing...</p>
        )}
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.user_id === currentUserId ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-3 ${
                  msg.user_id === currentUserId
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <p className="text-sm">{msg.message}</p>
                <p className="text-xs opacity-70 mt-1">
                  {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-3 border-t space-y-2">
        <div className="flex flex-wrap gap-1">
          {quickMessages.map((msg, idx) => (
            <Button
              key={idx}
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={() => setNewMessage(msg)}
            >
              {msg}
            </Button>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          />
          <Button size="icon" variant="outline">
            <Smile className="w-4 h-4" />
          </Button>
          <Button size="icon" onClick={sendMessage}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
