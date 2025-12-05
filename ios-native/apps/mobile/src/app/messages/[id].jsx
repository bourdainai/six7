import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Send, MoreVertical } from "lucide-react-native";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/utils/auth/useAuth";
import { format, isToday, isYesterday } from "date-fns";

const colors = {
  background: "#FFFFFF",
  foreground: "#0A0A0A",
  gray: "#666666",
  lightGray: "#F8F8F8",
  border: "#E5E5E5",
  messageSent: "#0A0A0A",
  messageReceived: "#F3F4F6",
};

export default function ConversationDetail() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id: conversationId } = useLocalSearchParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const scrollViewRef = useRef(null);
  const [messageInput, setMessageInput] = useState("");

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Fetch conversation details
  const { data: conversation, isLoading: conversationLoading } = useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: async () => {
      if (!conversationId) return null;

      const { data, error } = await supabase
        .from("conversations")
        .select(`
          *,
          listing:listings(id, title, seller_price, listing_images(image_url)),
          buyer:profiles!buyer_id(id, full_name, avatar_url),
          seller:profiles!seller_id(id, full_name, avatar_url)
        `)
        .eq("id", conversationId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!conversationId,
  });

  // Fetch messages
  const { data: messages, isLoading: messagesLoading, refetch: refetchMessages } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!conversationId,
    staleTime: 1000 * 10,
  });

  // Real-time subscription for messages
  useEffect(() => {
    if (!conversationId || !user?.id) return;

    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          refetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user?.id, refetchMessages]);

  // Mark messages as read when viewing
  useEffect(() => {
    if (!conversationId || !user?.id || !messages?.length) return;

    const markAsRead = async () => {
      await supabase
        .from("messages")
        .update({ read: true, read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .neq("sender_id", user.id)
        .eq("read", false);
    };

    markAsRead();
  }, [conversationId, user?.id, messages?.length]);

  // Scroll to bottom when messages change
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content) => {
      const { data, error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content,
      });

      if (error) throw error;

      // Update conversation updated_at
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);

      return data;
    },
    onSuccess: () => {
      setMessageInput("");
      refetchMessages();
    },
    onError: (error) => {
      console.error("Error sending message:", error);
    },
  });

  const handleSendMessage = () => {
    const content = messageInput.trim();
    if (!content || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(content);
  };

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    if (isToday(date)) {
      return format(date, "h:mm a");
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, "h:mm a")}`;
    }
    return format(date, "MMM d, h:mm a");
  };

  if (!fontsLoaded) {
    return null;
  }

  const otherUser = conversation
    ? user?.id === conversation.buyer_id
      ? conversation.seller
      : conversation.buyer
    : null;

  const listing = conversation?.listing;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="dark" />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingBottom: 12,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.background,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <ArrowLeft size={24} color={colors.foreground} />
        </TouchableOpacity>

        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.foreground,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
            overflow: "hidden",
          }}
        >
          {otherUser?.avatar_url ? (
            <Image source={{ uri: otherUser.avatar_url }} style={{ width: 40, height: 40 }} />
          ) : (
            <Text
              style={{
                fontFamily: "Inter_700Bold",
                fontSize: 16,
                color: colors.background,
              }}
            >
              {otherUser?.full_name?.[0]?.toUpperCase() || "?"}
            </Text>
          )}
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: "Inter_600SemiBold",
              fontSize: 16,
              color: colors.foreground,
            }}
            numberOfLines={1}
          >
            {otherUser?.full_name || "Unknown"}
          </Text>
          {listing && (
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 12,
                color: colors.gray,
              }}
              numberOfLines={1}
            >
              {listing.title}
            </Text>
          )}
        </View>

        <TouchableOpacity style={{ padding: 8 }}>
          <MoreVertical size={20} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {/* Listing Card */}
      {listing && (
        <TouchableOpacity
          onPress={() => router.push(`/listing/${listing.id}`)}
          style={{
            flexDirection: "row",
            padding: 12,
            backgroundColor: colors.lightGray,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          {listing.listing_images?.[0]?.image_url && (
            <Image
              source={{ uri: listing.listing_images[0].image_url }}
              style={{
                width: 50,
                height: 50,
                borderRadius: 8,
                marginRight: 12,
              }}
            />
          )}
          <View style={{ flex: 1, justifyContent: "center" }}>
            <Text
              style={{
                fontFamily: "Inter_500Medium",
                fontSize: 14,
                color: colors.foreground,
              }}
              numberOfLines={1}
            >
              {listing.title}
            </Text>
            <Text
              style={{
                fontFamily: "Inter_700Bold",
                fontSize: 14,
                color: colors.foreground,
              }}
            >
              £{Number(listing.seller_price || 0).toFixed(2)}
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Messages */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        {conversationLoading || messagesLoading ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="large" color={colors.foreground} />
          </View>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            style={{ flex: 1 }}
            contentContainerStyle={{
              padding: 16,
              paddingBottom: 20,
            }}
            showsVerticalScrollIndicator={false}
          >
            {messages?.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 40 }}>
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    fontSize: 14,
                    color: colors.gray,
                  }}
                >
                  No messages yet. Start the conversation!
                </Text>
              </View>
            ) : (
              messages?.map((message, index) => {
                const isSender = message.sender_id === user?.id;
                const showTime =
                  index === 0 ||
                  new Date(message.created_at).getTime() -
                    new Date(messages[index - 1].created_at).getTime() >
                    5 * 60 * 1000;

                return (
                  <View key={message.id}>
                    {showTime && (
                      <Text
                        style={{
                          fontFamily: "Inter_400Regular",
                          fontSize: 11,
                          color: colors.gray,
                          textAlign: "center",
                          marginVertical: 12,
                        }}
                      >
                        {formatMessageTime(message.created_at)}
                      </Text>
                    )}
                    <View
                      style={{
                        alignSelf: isSender ? "flex-end" : "flex-start",
                        maxWidth: "80%",
                        marginBottom: 8,
                      }}
                    >
                      <View
                        style={{
                          backgroundColor: isSender ? colors.messageSent : colors.messageReceived,
                          borderRadius: 16,
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                          borderBottomRightRadius: isSender ? 4 : 16,
                          borderBottomLeftRadius: isSender ? 16 : 4,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: "Inter_400Regular",
                            fontSize: 15,
                            color: isSender ? colors.background : colors.foreground,
                            lineHeight: 20,
                          }}
                        >
                          {message.content}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        )}

        {/* Message Input */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            paddingHorizontal: 16,
            paddingVertical: 12,
            paddingBottom: insets.bottom + 12,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.background,
          }}
        >
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "flex-end",
              backgroundColor: colors.lightGray,
              borderRadius: 24,
              paddingHorizontal: 16,
              paddingVertical: 8,
              marginRight: 12,
              minHeight: 44,
              maxHeight: 120,
            }}
          >
            <TextInput
              value={messageInput}
              onChangeText={setMessageInput}
              placeholder="Type a message..."
              placeholderTextColor={colors.gray}
              multiline
              style={{
                flex: 1,
                fontFamily: "Inter_400Regular",
                fontSize: 15,
                color: colors.foreground,
                maxHeight: 100,
                paddingTop: 0,
                paddingBottom: 0,
              }}
            />
          </View>
          <TouchableOpacity
            onPress={handleSendMessage}
            disabled={!messageInput.trim() || sendMessageMutation.isPending}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: messageInput.trim() ? colors.foreground : colors.lightGray,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {sendMessageMutation.isPending ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <Send
                size={20}
                color={messageInput.trim() ? colors.background : colors.gray}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}


