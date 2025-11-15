import { useState, useEffect, useRef } from "react";
import { Navigation } from "@/components/Navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { MessageReplySuggestions } from "@/components/MessageReplySuggestions";
import { MessageSafetyIndicator } from "@/components/MessageSafetyIndicator";
import { ConversationSentiment } from "@/components/ConversationSentiment";

interface Conversation {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  updated_at: string;
  listing: {
    title: string;
    seller_price: number;
    images: { image_url: string }[];
  };
  buyer: {
    full_name: string;
  };
  seller: {
    full_name: string;
  };
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read: boolean;
}

const Messages = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [shouldBlockMessage, setShouldBlockMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations, refetch: refetchConversations } = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("conversations")
        .select(`
          *,
          listing:listings(title, seller_price, images:listing_images(image_url))
        `)
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      // Fetch buyer and seller profiles separately
      const conversationsWithProfiles = await Promise.all(
        data.map(async (conv) => {
          const { data: buyer } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", conv.buyer_id)
            .single();

          const { data: seller } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", conv.seller_id)
            .single();

          return {
            ...conv,
            buyer: buyer || { full_name: "Unknown" },
            seller: seller || { full_name: "Unknown" },
          };
        })
      );

      return conversationsWithProfiles as Conversation[];
    },
    enabled: !!user,
  });

  const { data: messages, refetch: refetchMessages } = useQuery({
    queryKey: ["messages", selectedConversation],
    queryFn: async () => {
      if (!selectedConversation) return [];
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", selectedConversation)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as Message[];
    },
    enabled: !!selectedConversation,
  });

  // Real-time subscription for messages
  useEffect(() => {
    if (!selectedConversation) return;

    const channel = supabase
      .channel(`messages:${selectedConversation}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selectedConversation}`,
        },
        () => {
          refetchMessages();
          refetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation || !user || shouldBlockMessage) return;

    try {
      const { error } = await supabase.from("messages").insert({
        conversation_id: selectedConversation,
        sender_id: user.id,
        content: messageInput.trim(),
      });

      if (error) throw error;

      // Update conversation updated_at
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", selectedConversation);

      setMessageInput("");
      setShouldBlockMessage(false);
      refetchMessages();
      refetchConversations();
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };

  const getUserRole = (): 'buyer' | 'seller' => {
    if (!selectedConv || !user) return 'buyer';
    return selectedConv.seller_id === user.id ? 'seller' : 'buyer';
  };

  const selectedConv = conversations?.find((c) => c.id === selectedConversation);

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8 pt-24 text-center">
          <p className="text-muted-foreground">Please sign in to view messages</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 pt-24">
        <h1 className="text-4xl font-bold mb-8">Messages</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
          {/* Conversations List */}
          <Card className="p-4 overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Conversations</h2>
            {conversations && conversations.length > 0 ? (
              <div className="space-y-2">
                {conversations.map((conv) => {
                  const otherUser = conv.buyer_id === user.id ? conv.seller : conv.buyer;
                  const firstImage = conv.listing.images?.[0];
                  
                  return (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv.id)}
                      className={`w-full p-3 rounded-lg text-left transition-colors ${
                        selectedConversation === conv.id
                          ? "bg-primary/10 border-primary"
                          : "bg-muted hover:bg-muted/80"
                      } border`}
                    >
                      <div className="flex gap-3">
                        {firstImage && (
                          <img
                            src={firstImage.image_url}
                            alt={conv.listing.title}
                            className="w-12 h-12 object-cover rounded"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{conv.listing.title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {otherUser.full_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(conv.updated_at), "MMM d, h:mm a")}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="mx-auto h-12 w-12 mb-2 opacity-50" />
                <p>No conversations yet</p>
              </div>
            )}
          </Card>

          {/* Messages Area */}
          <Card className="lg:col-span-2 flex flex-col">
            {selectedConv ? (
              <>
                {/* Header */}
                <div className="p-4 border-b space-y-3">
                  <div className="flex items-center gap-3">
                    {selectedConv.listing.images?.[0] && (
                      <img
                        src={selectedConv.listing.images[0].image_url}
                        alt={selectedConv.listing.title}
                        className="w-12 h-12 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold">{selectedConv.listing.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedConv.buyer_id === user.id
                          ? selectedConv.seller.full_name
                          : selectedConv.buyer.full_name}
                      </p>
                    </div>
                    <Badge>£{selectedConv.listing.seller_price}</Badge>
                  </div>
                  
                  {messages && messages.length > 0 && (
                    <ConversationSentiment 
                      conversationId={selectedConversation!}
                      messages={messages.map(m => ({
                        role: m.sender_id === selectedConv.seller_id ? 'seller' : 'buyer',
                        content: m.content
                      }))}
                    />
                  )}
                </div>

                {/* Messages */}
                <div className="flex-1 p-4 overflow-y-auto">
                  {messages && messages.length > 0 ? (
                    <div className="space-y-4">
                      {messages.map((msg) => {
                        const isOwnMessage = msg.sender_id === user.id;
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-lg p-3 ${
                                isOwnMessage
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                              }`}
                            >
                              <p className="text-sm">{msg.content}</p>
                              <p
                                className={`text-xs mt-1 ${
                                  isOwnMessage
                                    ? "text-primary-foreground/70"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {format(new Date(msg.created_at), "h:mm a")}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="p-4 border-t space-y-3">
                  <MessageSafetyIndicator 
                    message={messageInput}
                    onBlock={() => setShouldBlockMessage(true)}
                  />
                  
                  <MessageReplySuggestions
                    conversationId={selectedConversation!}
                    userRole={getUserRole()}
                    onSelectSuggestion={(text) => {
                      setMessageInput(text);
                      setShouldBlockMessage(false);
                    }}
                  />
                  
                  <div className="flex gap-2">
                    <Input
                      value={messageInput}
                      onChange={(e) => {
                        setMessageInput(e.target.value);
                        setShouldBlockMessage(false);
                      }}
                      onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                      placeholder="Type a message..."
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleSendMessage} 
                      disabled={!messageInput.trim() || shouldBlockMessage}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="mx-auto h-16 w-16 mb-4 opacity-50" />
                  <p>Select a conversation to start messaging</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Messages;