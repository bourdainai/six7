import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Search, MessageCircle } from "lucide-react-native";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/utils/supabase";
import { useAuth } from "@/utils/auth/useAuth";
import { format, formatDistanceToNow } from "date-fns";

const colors = {
  background: "#FFFFFF",
  foreground: "#0A0A0A",
  gray: "#666666",
  lightGray: "#F8F8F8",
  border: "#E5E5E5",
};

export default function Messages() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Fetch conversations
  const { data: conversationsData, isLoading, refetch } = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("conversations")
        .select(`
          *,
          listing:listings!inner(id, title, seller_price, listing_images(image_url))
        `)
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles and last messages
      const buyerIds = [...new Set(data.map((c) => c.buyer_id))];
      const sellerIds = [...new Set(data.map((c) => c.seller_id))];

      const [buyersRes, sellersRes, messagesRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, avatar_url").in("id", buyerIds),
        supabase.from("profiles").select("id, full_name, avatar_url").in("id", sellerIds),
        supabase
          .from("messages")
          .select("conversation_id, content, created_at, sender_id")
          .in("conversation_id", data.map((c) => c.id))
          .order("created_at", { ascending: false }),
      ]);

      const buyerMap = new Map(buyersRes.data?.map((b) => [b.id, b]) || []);
      const sellerMap = new Map(sellersRes.data?.map((s) => [s.id, s]) || []);

      // Get last message for each conversation
      const lastMessages = new Map();
      messagesRes.data?.forEach((msg) => {
        if (!lastMessages.has(msg.conversation_id)) {
          lastMessages.set(msg.conversation_id, msg);
        }
      });

      return data.map((conv) => {
        const otherUser =
          conv.buyer_id === user.id
            ? sellerMap.get(conv.seller_id)
            : buyerMap.get(conv.buyer_id);
        const lastMessage = lastMessages.get(conv.id);

        return {
          ...conv,
          otherUser: otherUser || { id: conv.seller_id === user.id ? conv.buyer_id : conv.seller_id, full_name: "Unknown" },
          lastMessage: lastMessage?.content || "",
          lastMessageTime: lastMessage?.created_at || conv.updated_at,
          unreadCount: 0, // TODO: Calculate unread count
        };
      });
    },
    enabled: !!user?.id,
    staleTime: 1000 * 30,
  });

  // Real-time subscription for conversations
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("conversations-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
          filter: `buyer_id=eq.${user.id}`,
        },
        () => {
          refetch();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
          filter: `seller_id=eq.${user.id}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refetch]);

  useEffect(() => {
    if (conversationsData) {
      setConversations(conversationsData);
    }
  }, [conversationsData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.otherUser?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.listing?.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!fontsLoaded) {
    return null;
  }

  const ConversationItem = ({ conversation }) => {
    const formatTime = (timestamp) => {
      if (!timestamp) return "";
      try {
        return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
      } catch {
        return "";
      }
    };

    const otherUser = conversation.otherUser;
    const listingImage = conversation.listing?.listing_images?.[0]?.image_url;

    return (
      <TouchableOpacity
        onPress={() => router.push(`/messages/${conversation.id}`)}
        style={{
          backgroundColor: conversation.unreadCount > 0 ? colors.lightGray : colors.background,
          borderRadius: 12,
          padding: 16,
          marginBottom: 12,
          flexDirection: "row",
          alignItems: "center",
          borderWidth: 1,
          borderColor: conversation.unreadCount > 0 ? colors.foreground : colors.border,
        }}
      >
        {/* Avatar */}
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: colors.foreground,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 14,
            overflow: "hidden",
          }}
        >
          {otherUser?.avatar_url ? (
            <Image source={{ uri: otherUser.avatar_url }} style={{ width: 56, height: 56 }} />
          ) : (
            <Text
              style={{
                fontFamily: "Inter_700Bold",
                fontSize: 20,
                color: colors.background,
              }}
            >
              {otherUser?.full_name?.[0]?.toUpperCase() || "?"}
            </Text>
          )}
        </View>

        <View style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 4,
            }}
          >
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 15,
                color: colors.foreground,
              }}
              numberOfLines={1}
            >
              {otherUser?.full_name || "Unknown User"}
            </Text>
            {conversation.lastMessageTime && (
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 12,
                  color: colors.gray,
                }}
              >
                {formatTime(conversation.lastMessageTime)}
              </Text>
            )}
          </View>
          <Text
            style={{
              fontFamily: conversation.unreadCount > 0 ? "Inter_600SemiBold" : "Inter_400Regular",
              fontSize: 14,
              color: conversation.unreadCount > 0 ? colors.foreground : colors.gray,
            }}
            numberOfLines={1}
          >
            {conversation.lastMessage || "No messages yet"}
          </Text>
          {conversation.listing && (
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 12,
                color: colors.gray,
                marginTop: 4,
              }}
              numberOfLines={1}
            >
              {conversation.listing.title}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const EmptyState = () => (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 40,
      }}
    >
      <View
        style={{
          width: 100,
          height: 100,
          backgroundColor: colors.lightGray,
          borderRadius: 50,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
        }}
      >
        <MessageCircle size={48} color={colors.foreground} strokeWidth={2} />
      </View>
      <Text
        style={{
          fontFamily: "Inter_700Bold",
          fontSize: 24,
          color: colors.foreground,
          marginBottom: 12,
          textAlign: "center",
          letterSpacing: -0.5,
        }}
      >
        No Messages Yet
      </Text>
      <Text
        style={{
          fontFamily: "Inter_400Regular",
          fontSize: 14,
          color: colors.gray,
          textAlign: "center",
          lineHeight: 22,
        }}
      >
        Start conversations with sellers{"\n"}to negotiate and trade
      </Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="dark" />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 24,
          paddingBottom: 20,
          backgroundColor: colors.background,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            fontSize: 32,
            color: colors.foreground,
            marginBottom: 20,
            letterSpacing: -1,
          }}
        >
          Messages
        </Text>

        {/* Search */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.lightGray,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}
        >
          <Search size={20} color={colors.gray} strokeWidth={2} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search conversations..."
            placeholderTextColor={colors.gray}
            style={{
              flex: 1,
              fontFamily: "Inter_500Medium",
              fontSize: 14,
              color: colors.foreground,
              marginLeft: 12,
            }}
          />
        </View>
      </View>

      {/* Conversations List */}
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={colors.foreground} />
        </View>
      ) : filteredConversations.length === 0 ? (
        <EmptyState />
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 20,
            paddingBottom: insets.bottom + 100,
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.foreground} />
          }
          showsVerticalScrollIndicator={false}
        >
          {filteredConversations.map((conversation) => (
            <ConversationItem key={conversation.id} conversation={conversation} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}
