import { useState, useEffect, useRef } from "react";
import { PageLayout } from "@/components/PageLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Send, MessageSquare, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { MessageReplySuggestions } from "@/components/MessageReplySuggestions";
import { MessageSafetyIndicator } from "@/components/MessageSafetyIndicator";
import { ConversationSentiment } from "@/components/ConversationSentiment";
import { OfferCard } from "@/components/OfferCard";
import { FileUpload, AttachmentData } from "@/components/messages/FileUpload";
import { MessageAttachments } from "@/components/messages/MessageAttachments";
import { AdminUserList } from "@/components/admin/AdminUserList";

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
  metadata?: {
    attachments?: AttachmentData[];
  };
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
  const { data: isAdmin } = useAdminCheck();
  const { toast } = useToast();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [shouldBlockMessage, setShouldBlockMessage] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<AttachmentData[]>([]);
  const [adminMode, setAdminMode] = useState(false);
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

  // Handle admin creating a test conversation with a user
  const handleSelectUserForAdmin = async (userId: string, userName: string) => {
    if (!user) return;

    try {
      // First, check if a conversation already exists
      const { data: existingConversations } = await supabase
        .from("conversations")
        .select("id")
        .or(`and(buyer_id.eq.${user.id},seller_id.eq.${userId}),and(buyer_id.eq.${userId},seller_id.eq.${user.id})`);

      if (existingConversations && existingConversations.length > 0) {
        setSelectedConversation(existingConversations[0].id);
        setAdminMode(false);
        return;
      }

      // Get a dummy listing for the test conversation
      const { data: dummyListing } = await supabase
        .from("listings")
        .select("id, seller_id")
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (!dummyListing) {
        toast({
          title: "No listings available",
          description: "Please create a listing first to test messaging.",
          variant: "destructive",
        });
        return;
      }

      // Create new conversation
      const { data: newConversation, error } = await supabase
        .from("conversations")
        .insert({
          buyer_id: user.id,
          seller_id: userId,
          listing_id: dummyListing.id,
        })
        .select()
        .single();

      if (error) throw error;

      setSelectedConversation(newConversation.id);
      setAdminMode(false);
      refetchConversations();
      toast({
        title: "Test conversation created",
        description: `You can now message ${userName}`,
      });
    } catch (error) {
      console.error("Error creating test conversation:", error);
      toast({
        title: "Error",
        description: "Failed to create test conversation",
        variant: "destructive",
      });
    }
  };

  const handleSendMessage = async () => {
    if ((!messageInput.trim() && pendingAttachments.length === 0) || !selectedConversation || !user || shouldBlockMessage) return;

    try {
      const metadata = pendingAttachments.length > 0 
        ? { attachments: pendingAttachments }
        : undefined;

      const { error } = await supabase.from("messages").insert({
        conversation_id: selectedConversation,
        sender_id: user.id,
        content: messageInput.trim(),
        metadata: metadata as any,
      });

      if (error) throw error;

      // Update conversation updated_at
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", selectedConversation);

      setMessageInput("");
      setPendingAttachments([]);
      setShouldBlockMessage(false);
      refetchMessages();
      refetchConversations();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to send message. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
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
      <PageLayout>
        <div className="text-center">
          <p className="text-muted-foreground">Please sign in to view messages</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
        <div className="mb-8 space-y-2">
          <h1 className="text-3xl font-light text-foreground tracking-tight">
            Messages
          </h1>
          <p className="text-base text-muted-foreground font-normal tracking-tight">
            Connect with buyers and sellers
          </p>
        </div>

        {/* Admin Mode Toggle */}
        {isAdmin && (
          <Card className="p-4 mb-6 border-primary/20 bg-primary/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-primary" />
                <div>
                  <Label htmlFor="admin-mode" className="text-base font-semibold cursor-pointer">
                    Admin Test Mode
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Message any user to test the system
                  </p>
                </div>
              </div>
              <Switch
                id="admin-mode"
                checked={adminMode}
                onCheckedChange={setAdminMode}
              />
            </div>
            {adminMode && (
              <Badge variant="outline" className="mt-3 bg-primary/10 text-primary border-primary/20">
                ⚡ Admin Mode Active
              </Badge>
            )}
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
          {/* Conversations List or Admin User List */}
          <Card className="p-4 overflow-y-auto">
            {adminMode && isAdmin ? (
              <>
                <h2 className="text-lg font-normal mb-4 tracking-tight">All Users</h2>
                <AdminUserList
                  onSelectUser={handleSelectUserForAdmin}
                  currentUserId={user?.id}
                />
              </>
            ) : (
              <>
                <h2 className="text-lg font-normal mb-4 tracking-tight">Conversations</h2>
            {conversations && conversations.length > 0 ? (
              <div className="space-y-2">
                {conversations.map((conv) => {
                  const otherUser = conv.buyer_id === user.id ? conv.seller : conv.buyer;
                  const firstImage = conv.listing?.images?.[0];
                  
                  return (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv.id)}
                      className={`w-full p-3 text-left transition-colors duration-fast border ${
                        selectedConversation === conv.id
                          ? "bg-soft-neutral border-foreground"
                          : "bg-background border-divider-gray hover:bg-soft-neutral"
                      }`}
                    >
                      <div className="flex gap-3">
                        {firstImage && (
                          <img
                            src={firstImage.image_url}
                            alt={conv.listing?.title || "Item"}
                            className="w-12 h-12 object-cover border border-divider-gray"
                            width="48"
                            height="48"
                            loading="lazy"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-normal text-sm truncate tracking-tight">{conv.listing?.title || "Untitled"}</p>
                          <p className="text-xs text-muted-foreground truncate font-normal">
                            {otherUser?.full_name || "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground font-normal">
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
                <p className="font-normal">No conversations yet</p>
              </div>
            )}
              </>
            )}
          </Card>

          {/* Messages Area */}
          <Card className="lg:col-span-2 flex flex-col">
            {selectedConv ? (
              <>
                {/* Header */}
                <div className="p-4 border-b border-divider-gray space-y-3">
                  <div className="flex items-center gap-3">
                    {selectedConv.listing?.images?.[0] && (
                      <img
                        src={selectedConv.listing.images[0].image_url}
                        alt={selectedConv.listing?.title || "Item"}
                        className="w-12 h-12 object-cover border border-divider-gray"
                        width="48"
                        height="48"
                        loading="lazy"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-normal tracking-tight">{selectedConv.listing?.title || "Untitled"}</h3>
                      <p className="text-sm text-muted-foreground font-normal">
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
                                  className={`max-w-[70%] p-3 border ${
                                    isOwnMessage
                                      ? "bg-foreground text-background border-foreground"
                                      : "bg-soft-neutral border-divider-gray"
                                  }`}
                                >
                                  {msg.content && (
                                    <p className="text-sm font-normal tracking-tight">{msg.content}</p>
                                  )}
                                  <MessageAttachments attachments={msg.metadata?.attachments || []} />
                                  <p
                                    className={`text-xs mt-1 font-normal ${
                                      isOwnMessage
                                        ? "text-background/70"
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
                <div className="p-4 border-t border-divider-gray space-y-3">
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
                  
                  <FileUpload
                    conversationId={selectedConversation!}
                    onFilesSelected={(files) => setPendingAttachments(files)}
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
                      disabled={(!messageInput.trim() && pendingAttachments.length === 0) || shouldBlockMessage}
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
    </PageLayout>
  );
};

export default Messages;