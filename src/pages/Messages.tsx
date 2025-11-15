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
import { OfferCard } from "@/components/OfferCard";

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
  } | null;
  buyer: {
    full_name: string;
  } | null;
  seller: {
    full_name: string;
  } | null;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read: boolean;
}

interface Offer {
  id: string;
  amount: number;
  message: string | null;
  status: string;
  buyer_id: string;
  seller_id: string;
  listing_id: string;
  created_at: string;
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
          listing:listings!inner(title, seller_price, images:listing_images(image_url))
        `)
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles separately but efficiently
      const buyerIds = [...new Set(data.map(c => c.buyer_id))];
      const sellerIds = [...new Set(data.map(c => c.seller_id))];
      
      const { data: buyers } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", buyerIds);
      
      const { data: sellers } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", sellerIds);

      const buyerMap = new Map(buyers?.map(b => [b.id, b]) || []);
      const sellerMap = new Map(sellers?.map(s => [s.id, s]) || []);

      return data.map(conv => ({
        ...conv,
        buyer: buyerMap.get(conv.buyer_id) || { full_name: "Unknown" },
        seller: sellerMap.get(conv.seller_id) || { full_name: "Unknown" },
      })) as Conversation[];
    },
    enabled: !!user,
    staleTime: 1000 * 30, // 30 seconds
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
    staleTime: 1000 * 10, // 10 seconds
  });

  const { data: offers, refetch: refetchOffers } = useQuery({
    queryKey: ["offers", selectedConversation],
    queryFn: async () => {
      if (!selectedConversation) return [];
      
      const selectedConv = conversations?.find(c => c.id === selectedConversation);
      if (!selectedConv) return [];

      const { data, error } = await supabase
        .from("offers")
        .select("*")
        .eq("listing_id", selectedConv.listing_id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as Offer[];
    },
    enabled: !!selectedConversation && !!conversations,
    staleTime: 1000 * 15, // 15 seconds
  });

  // Real-time subscription for messages and offers
  useEffect(() => {
    if (!selectedConversation || !user) return;

    const channel = supabase
      .channel(`conversation:${selectedConversation}`, {
        config: {
          broadcast: { self: true },
        },
      })
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
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "offers",
        },
        () => {
          refetchOffers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation, user, refetchMessages, refetchOffers]);

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
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
        <div className="mb-8 space-y-2">
          <h1 className="text-3xl font-light text-foreground">
            Messages
          </h1>
          <p className="text-base text-muted-foreground font-light">
            Connect with buyers and sellers
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
          {/* Conversations List */}
          <Card className="p-4 overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Conversations</h2>
            {conversations && conversations.length > 0 ? (
              <div className="space-y-2">
                {conversations.map((conv) => {
                  const otherUser = conv.buyer_id === user.id ? conv.seller : conv.buyer;
                  const firstImage = conv.listing?.images?.[0];
                  
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
                            alt={conv.listing?.title || "Item"}
                            className="w-12 h-12 object-cover rounded"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{conv.listing?.title || "Untitled"}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {otherUser?.full_name || "Unknown"}
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
                    {selectedConv.listing?.images?.[0] && (
                      <img
                        src={selectedConv.listing.images[0].image_url}
                        alt={selectedConv.listing?.title || "Item"}
                        className="w-12 h-12 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold">{selectedConv.listing?.title || "Untitled"}</h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedConv.buyer_id === user.id
                          ? selectedConv.seller?.full_name || "Unknown"
                          : selectedConv.buyer?.full_name || "Unknown"}
                      </p>
                    </div>
                    <Badge>£{selectedConv.listing?.seller_price || 0}</Badge>
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
                  {(messages && messages.length > 0) || (offers && offers.length > 0) ? (
                    <div className="space-y-4">
                      {/* Merge and sort messages and offers by timestamp */}
                      {[
                        ...(messages?.map(msg => ({ type: 'message' as const, data: msg, timestamp: new Date(msg.created_at).getTime() })) || []),
                        ...(offers?.map(offer => ({ type: 'offer' as const, data: offer, timestamp: new Date(offer.created_at).getTime() })) || [])
                      ]
                        .sort((a, b) => a.timestamp - b.timestamp)
                        .map((item, index) => {
                          if (item.type === 'message') {
                            const msg = item.data;
                            const isOwnMessage = msg.sender_id === user.id;
                            return (
                              <div
                                key={`msg-${msg.id}`}
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
                          } else {
                            const offer = item.data;
                            return (
                              <OfferCard
                                key={`offer-${offer.id}`}
                                offer={offer}
                                userRole={getUserRole()}
                                userId={user.id}
                                onOfferUpdate={() => {
                                  refetchOffers();
                                  refetchMessages();
                                }}
                              />
                            );
                          }
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