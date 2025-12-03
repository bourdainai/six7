import { useState, useEffect, useRef } from "react";
import { PageLayout } from "@/components/PageLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Send, MessageSquare, Zap, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { MessageReplySuggestions } from "@/components/MessageReplySuggestions";
import { MessageSafetyIndicator } from "@/components/MessageSafetyIndicator";
import { OfferCard } from "@/components/OfferCard";
import { FileUpload, AttachmentData } from "@/components/messages/FileUpload";
import { MessageAttachments } from "@/components/messages/MessageAttachments";
import { AdminUserList } from "@/components/admin/AdminUserList";
import { TypingIndicator } from "@/components/messages/TypingIndicator";
import { ReadReceipt } from "@/components/messages/ReadReceipt";
import { ConversationItem } from "@/components/messages/ConversationItem";
import { ImageLightbox } from "@/components/messages/ImageLightbox";
import { MessageSearch } from "@/components/messages/MessageSearch";
import { MessageActions } from "@/components/messages/MessageActions";
import { MessageReactions } from "@/components/messages/MessageReactions";
import { ConversationMenu } from "@/components/messages/ConversationMenu";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { useBrowserNotifications } from "@/hooks/useBrowserNotifications";
import { useMobileDetect } from "@/hooks/useMobileDetect";

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
    id: string;
    full_name: string;
  } | null;
  seller: {
    id: string;
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
  read_at: string | null;
  metadata?: {
    attachments?: AttachmentData[];
    edited?: boolean;
    edited_at?: string;
    deleted?: boolean;
    reactions?: Record<string, string[]>;
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
  const isMobile = useMobileDetect();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [shouldBlockMessage, setShouldBlockMessage] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<AttachmentData[]>([]);
  const [adminMode, setAdminMode] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<{ id: string; content: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Browser notifications
  const { permission, requestPermission } = useBrowserNotifications(user?.id);

  const handleBackToList = () => {
    setSelectedConversation(null);
  };

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
        buyer: buyerMap.get(conv.buyer_id) || { id: conv.buyer_id, full_name: "Unknown" },
        seller: sellerMap.get(conv.seller_id) || { id: conv.seller_id, full_name: "Unknown" },
      })) as Conversation[];
    },
    enabled: !!user,
    staleTime: 1000 * 30, // 30 seconds
  });

  // Get selected conversation and other user info
  const selectedConv = conversations?.find((c) => c.id === selectedConversation);
  const otherUser = selectedConv && user
    ? (selectedConv.buyer_id === user.id ? selectedConv.seller : selectedConv.buyer)
    : null;

  // Typing indicator for selected conversation
  const { typingUsers, startTyping, stopTyping } = useTypingIndicator(
    selectedConversation || '',
    user?.id
  );

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

  // Mark messages as read when conversation is opened
  useEffect(() => {
    if (!selectedConversation || !user) return;

    const markAsRead = async () => {
      await supabase
        .from('messages')
        .update({
          read: true,
          read_at: new Date().toISOString()
        })
        .eq('conversation_id', selectedConversation)
        .eq('read', false)
        .neq('sender_id', user.id);
    };

    markAsRead();
  }, [selectedConversation, user]);

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
      logger.error("Error creating test conversation:", error);
      toast({
        title: "Error",
        description: "Failed to create test conversation",
        variant: "destructive",
      });
    }
  };

  const handleSendMessage = async () => {
    // Allow sending if there's either text content OR attachments
    if ((messageInput.trim() === '' && pendingAttachments.length === 0) || !selectedConversation || !user || shouldBlockMessage) return;

    try {
      const contentToSend = messageInput.trim();

      // If editing, update existing message
      if (editingMessage) {
        const { error } = await supabase
          .from('messages')
          .update({
            content: contentToSend,
            metadata: { edited: true, edited_at: new Date().toISOString() }
          })
          .eq('id', editingMessage.id);

        if (error) throw error;

        setEditingMessage(null);
        setMessageInput("");
        refetchMessages();
        return;
      }

      const metadata = pendingAttachments.length > 0
        ? { attachments: pendingAttachments }
        : undefined;

      const { error } = await supabase.from("messages").insert({
        conversation_id: selectedConversation,
        sender_id: user.id,
        content: contentToSend,
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
      stopTyping();
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

  const handleInputChange = (value: string) => {
    setMessageInput(value);
    setShouldBlockMessage(false);

    // Clear editing mode if user changes text significantly
    if (editingMessage && value !== editingMessage.content) {
      setEditingMessage(null);
    }

    // Start typing indicator
    if (value.length > 0 && otherUser) {
      startTyping(user?.email || 'User');

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping();
      }, 2000);
    } else {
      stopTyping();
    }
  };

  const handleImageClick = (images: string[], index: number) => {
    setLightboxImages(images);
    setLightboxIndex(index);
    setIsLightboxOpen(true);
  };

  const handleEditMessage = (id: string, content: string) => {
    setEditingMessage({ id, content });
    setMessageInput(content);
  };

  const scrollToMessage = (messageId: string) => {
    const element = document.getElementById(`message-${messageId}`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    element?.classList.add('bg-accent');
    setTimeout(() => element?.classList.remove('bg-accent'), 2000);
  };

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
        <div className="mb-6 p-5 bg-yellow-500/10 border-2 border-yellow-500/30 rounded-xl">
          <div className="flex items-start gap-4">
            <Zap className="h-6 w-6 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-yellow-900 dark:text-yellow-100 mb-1">Admin Test Mode</h3>
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Message any user to test the system
              </p>
              {adminMode && (
                <Badge variant="outline" className="mt-3 bg-yellow-500/20 text-yellow-900 dark:text-yellow-100 border-yellow-500/40">
                  ⚡ Active
                </Badge>
              )}
            </div>
            <Switch
              id="admin-mode"
              checked={adminMode}
              onCheckedChange={setAdminMode}
              className="mt-1"
            />
          </div>
        </div>
      )}

      <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'} gap-6 h-[calc(100vh-14rem)]`}>
        {/* Conversations List or Admin User List - Hidden on mobile when conversation is selected */}
        <Card className={`p-0 overflow-hidden border-0 shadow-sm ${isMobile && selectedConversation ? 'hidden' : 'block'} ${!isMobile ? 'lg:block' : ''}`}>
          <div className="p-4 border-b border-border/30">
            <h2 className="text-lg font-semibold tracking-tight">
              {adminMode && isAdmin ? 'All Users' : 'Messages'}
            </h2>
          </div>

          <div className="overflow-y-auto" style={{ height: 'calc(100% - 4rem)' }}>
            {adminMode && isAdmin ? (
              <div className="p-3">
                <AdminUserList
                  onSelectUser={handleSelectUserForAdmin}
                  currentUserId={user?.id}
                />
              </div>
            ) : (
              <>
                {conversations && conversations.length > 0 ? (
                  <div className="space-y-1 p-3">
                    {conversations.map((conv) => {
                      const otherUserData = conv.buyer_id === user.id ? conv.seller : conv.buyer;
                      const firstImage = conv.listing?.images?.[0];

                      return (
                        <ConversationItem
                          key={conv.id}
                          conversation={conv}
                          isSelected={selectedConversation === conv.id}
                          otherUser={otherUserData}
                          firstImage={firstImage}
                          currentUserId={user.id}
                          onClick={() => setSelectedConversation(conv.id)}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 px-4 text-muted-foreground">
                    <MessageSquare className="mx-auto h-14 w-14 mb-3 opacity-40" />
                    <p className="font-medium">No conversations yet</p>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>

        {/* Messages Area - Full width on mobile when conversation is selected */}
        <Card className={`${isMobile ? (selectedConversation ? 'block' : 'hidden') : 'lg:col-span-2'} flex flex-col overflow-hidden border-0 shadow-sm`}>
          {selectedConv ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-border/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {isMobile && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleBackToList}
                        className="flex-shrink-0"
                      >
                        <ArrowLeft className="h-5 w-5" />
                      </Button>
                    )}
                    {selectedConv.listing?.images?.[0] && (
                      <img
                        src={selectedConv.listing.images[0].image_url}
                        alt={selectedConv.listing?.title || "Item"}
                        className="w-10 h-10 object-cover flex-shrink-0 border border-border/30"
                        width="40"
                        height="40"
                        loading="lazy"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base tracking-tight truncate">{selectedConv.listing?.title || "Untitled"}</h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {selectedConv.buyer_id === user.id
                          ? selectedConv.seller?.full_name || "Unknown"
                          : selectedConv.buyer?.full_name || "Unknown"}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-sm px-3 py-1 font-medium flex-shrink-0 hidden sm:flex">
                      £{selectedConv.listing?.seller_price || 0}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1 ml-4">
                    <MessageSearch
                      messages={messages || []}
                      currentUserId={user.id}
                      onSelectMessage={scrollToMessage}
                    />
                    <ConversationMenu
                      conversationId={selectedConv.id}
                      otherUserId={otherUser?.id || ''}
                      otherUserName={otherUser?.full_name || 'User'}
                    />
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 p-4 overflow-y-auto bg-background">
                {(messages && messages.length > 0) || (offers && offers.length > 0) ? (
                  <div className="space-y-3">
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
                          const attachments = msg.metadata?.attachments || [];
                          const imageAttachments = attachments
                            .filter((a: any) => a.file_type.startsWith('image/'))
                            .map((a: any) => a.file_url);

                          return (
                            <div
                              key={`msg-${msg.id}`}
                              id={`message-${msg.id}`}
                              className={`flex group mb-2 ${isOwnMessage ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[70%] rounded-md px-3.5 py-2.5 relative border ${isOwnMessage
                                  ? "bg-foreground text-background border-foreground/10"
                                  : "bg-muted/30 text-foreground border-border/50"
                                  }`}
                              >
                                {msg.content && msg.content !== '[Message deleted]' ? (
                                  <p className="text-sm leading-relaxed break-words">{msg.content}</p>
                                ) : (
                                  <p className="text-sm italic opacity-50">
                                    {msg.content}
                                  </p>
                                )}
                                {msg.metadata?.edited && (
                                  <span className={`text-xs mt-1 block opacity-60`}>
                                    (edited)
                                  </span>
                                )}
                                {attachments.length > 0 && (
                                  <div
                                    className="cursor-pointer mt-3"
                                    onClick={() => imageAttachments.length > 0 && handleImageClick(imageAttachments, 0)}
                                  >
                                    <MessageAttachments attachments={attachments} />
                                  </div>
                                )}

                                <div className="flex items-center justify-between gap-2 mt-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className={`text-[10px] font-medium tracking-wide ${isOwnMessage
                                        ? "text-background/40"
                                        : "text-muted-foreground/50"
                                        }`}
                                    >
                                      {format(new Date(msg.created_at), "h:mm a")}
                                    </span>
                                    {isOwnMessage && (
                                      <ReadReceipt
                                        isSent={true}
                                        isRead={msg.read}
                                        readAt={msg.read_at}
                                      />
                                    )}
                                  </div>
                                  {msg.content !== '[Message deleted]' && (
                                    <MessageActions
                                      messageId={msg.id}
                                      messageContent={msg.content}
                                      isOwnMessage={isOwnMessage}
                                      createdAt={msg.created_at}
                                      onEdit={handleEditMessage}
                                      onDelete={() => refetchMessages()}
                                    />
                                  )}
                                </div>

                                {!msg.metadata?.deleted && (
                                  <div className="mt-2 pt-2 border-t border-border/20">
                                    <MessageReactions
                                      messageId={msg.id}
                                      currentUserId={user.id}
                                      existingReactions={msg.metadata?.reactions as any}
                                    />
                                  </div>
                                )}
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

                {/* Typing Indicator */}
                {typingUsers.length > 0 && (
                  <TypingIndicator userName={typingUsers[0].userName} />
                )}
              </div>

              {/* Input */}
              <div className="p-4 bg-background space-y-3">
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
                    setEditingMessage(null);
                  }}
                />

                {editingMessage && (
                  <div className="flex items-center justify-between p-2 bg-accent rounded">
                    <span className="text-sm">Editing message...</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingMessage(null);
                        setMessageInput('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                )}

                <FileUpload
                  key={selectedConversation} // Reset component when conversation changes
                  conversationId={selectedConversation!}
                  onFilesSelected={(files) => setPendingAttachments(files)}
                  onClear={() => setPendingAttachments([])}
                />

                <div className="flex items-end gap-2">
                  <div className="flex-1 bg-muted/20 border border-border/50 px-3.5 py-2 focus-within:border-border transition-colors">
                    <input
                      value={messageInput}
                      onChange={(e) => handleInputChange(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                          stopTyping();
                        }
                      }}
                      placeholder={pendingAttachments.length > 0 ? "Add message (optional)" : "Type message"}
                      className="w-full bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground/40"
                    />
                  </div>
                  <Button
                    onClick={handleSendMessage}
                    disabled={(messageInput.trim() === '' && pendingAttachments.length === 0) || shouldBlockMessage}
                    size="icon"
                    className="h-9 w-9 bg-foreground text-background hover:bg-foreground/90 disabled:opacity-30"
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

      {/* Image Lightbox */}
      <ImageLightbox
        images={lightboxImages}
        initialIndex={lightboxIndex}
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
      />
    </PageLayout>
  );
};

export default Messages;