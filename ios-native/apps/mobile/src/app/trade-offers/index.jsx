import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowLeft as IncomingIcon,
  CheckCircle,
  XCircle,
  Clock,
  Package,
} from "lucide-react-native";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/utils/supabase";
import { useAuth } from "@/utils/auth/useAuth";
import { formatDistanceToNow } from "date-fns";

const colors = {
  background: "#FFFFFF",
  foreground: "#0A0A0A",
  gray: "#666666",
  lightGray: "#F8F8F8",
  border: "#E5E5E5",
};

export default function TradeOffersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState("incoming"); // 'incoming', 'outgoing', 'accepted', 'rejected'

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Fetch trade offers
  const { data: allOffers, isLoading, refetch } = useQuery({
    queryKey: ["trade-offers", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("trade_offers")
        .select(`
          *,
          target_listing:listings(
            id,
            title,
            seller_price,
            condition,
            listing_images(image_url)
          ),
          buyer:profiles!buyer_id(id, full_name, avatar_url),
          seller:profiles!seller_id(id, full_name, avatar_url)
        `)
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 30,
  });

  // Filter offers by tab
  const incomingOffers =
    allOffers?.filter((o) => o.seller_id === user?.id && o.status === "pending") || [];
  const outgoingOffers = allOffers?.filter((o) => o.buyer_id === user?.id) || [];
  const acceptedOffers = allOffers?.filter((o) => o.status === "accepted") || [];
  const rejectedOffers = allOffers?.filter((o) => o.status === "rejected") || [];

  const currentOffers =
    tab === "incoming"
      ? incomingOffers
      : tab === "outgoing"
      ? outgoingOffers
      : tab === "accepted"
      ? acceptedOffers
      : rejectedOffers;

  const acceptMutation = useMutation({
    mutationFn: async (offerId) => {
      const { data, error } = await supabase.functions.invoke("trade-accept", {
        body: { offerId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trade-offers"] });
      Alert.alert("Offer Accepted", "Trade completed successfully!");
    },
    onError: (error) => {
      Alert.alert("Error", error.message || "Failed to accept offer");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (offerId) => {
      const { data, error } = await supabase.functions.invoke("trade-reject", {
        body: { offerId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trade-offers"] });
      Alert.alert("Offer Rejected");
    },
    onError: (error) => {
      Alert.alert("Error", error.message || "Failed to reject offer");
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (!fontsLoaded) {
    return null;
  }

  const TradeOfferCard = ({ offer, userRole }) => {
    const tradeItems = offer.trade_items || [];
    const targetListing = offer.target_listing;
    const otherUser = userRole === "seller" ? offer.buyer : offer.seller;
    const imageUrl = targetListing?.listing_images?.[0]?.image_url;

    const valuations = offer.trade_item_valuations || [];
    const totalOfferedValue =
      valuations.reduce((sum, item) => sum + (item.valuation || 0), 0) +
        (offer.cash_amount || 0) || offer.cash_amount || 0;

    const targetValue = targetListing?.seller_price || 0;
    const isExpired = offer.expiry_date && new Date(offer.expiry_date) < new Date();

    const getStatusColor = () => {
      if (isExpired) return colors.gray;
      switch (offer.status) {
        case "accepted":
          return "#10B981";
        case "rejected":
          return "#EF4444";
        case "countered":
          return colors.gray;
        default:
          return colors.foreground;
      }
    };

    return (
      <View
        style={{
          backgroundColor: colors.background,
          borderRadius: 12,
          padding: 16,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 12,
          }}
        >
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <ArrowLeftRight size={16} color={colors.foreground} />
              <Text
                style={{
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 15,
                  color: colors.foreground,
                }}
              >
                {userRole === "seller" ? "Incoming" : "Outgoing"} Trade
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Clock size={14} color={colors.gray} />
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 12,
                  color: colors.gray,
                }}
              >
                {formatDistanceToNow(new Date(offer.created_at || ""), { addSuffix: true })}
              </Text>
            </View>
          </View>
          <View
            style={{
              backgroundColor: getStatusColor() + "20",
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 6,
            }}
          >
            <Text
              style={{
                fontFamily: "Inter_500Medium",
                fontSize: 12,
                color: getStatusColor(),
                textTransform: "capitalize",
              }}
            >
              {isExpired ? "Expired" : offer.status}
            </Text>
          </View>
        </View>

        {/* Trade Items */}
        <View style={{ marginBottom: 12 }}>
          <Text
            style={{
              fontFamily: "Inter_600SemiBold",
              fontSize: 13,
              color: colors.foreground,
              marginBottom: 8,
            }}
          >
            Offering:
          </Text>
          {tradeItems.map((item, idx) => (
            <View
              key={idx}
              style={{
                backgroundColor: colors.lightGray,
                borderRadius: 8,
                padding: 10,
                marginBottom: 6,
              }}
            >
              <Text
                style={{
                  fontFamily: "Inter_500Medium",
                  fontSize: 14,
                  color: colors.foreground,
                }}
                numberOfLines={1}
              >
                {item.title || `Item ${idx + 1}`}
              </Text>
              {valuations?.[idx]?.valuation && (
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    fontSize: 12,
                    color: colors.gray,
                    marginTop: 2,
                  }}
                >
                  £{valuations[idx].valuation.toFixed(2)}
                </Text>
              )}
            </View>
          ))}
          {offer.cash_amount > 0 && (
            <View
              style={{
                backgroundColor: colors.lightGray,
                borderRadius: 8,
                padding: 10,
                marginBottom: 6,
              }}
            >
              <Text
                style={{
                  fontFamily: "Inter_500Medium",
                  fontSize: 14,
                  color: colors.foreground,
                }}
              >
                Cash: £{Number(offer.cash_amount || 0).toFixed(2)}
              </Text>
            </View>
          )}
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: colors.border,
              paddingTop: 8,
              marginTop: 4,
            }}
          >
            <Text
              style={{
                fontFamily: "Inter_700Bold",
                fontSize: 14,
                color: colors.foreground,
              }}
            >
              Total: £{totalOfferedValue.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Target Listing */}
        {targetListing && (
          <View style={{ marginBottom: 12 }}>
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 13,
                color: colors.foreground,
                marginBottom: 8,
              }}
            >
              For:
            </Text>
            <View
              style={{
                flexDirection: "row",
                backgroundColor: colors.lightGray,
                borderRadius: 8,
                padding: 10,
                gap: 10,
              }}
            >
              {imageUrl && (
                <View
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 6,
                    backgroundColor: colors.border,
                    overflow: "hidden",
                  }}
                >
                  <Image source={{ uri: imageUrl }} style={{ width: 60, height: 60 }} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: "Inter_500Medium",
                    fontSize: 14,
                    color: colors.foreground,
                  }}
                  numberOfLines={2}
                >
                  {targetListing.title}
                </Text>
                {targetListing.condition && (
                  <Text
                    style={{
                      fontFamily: "Inter_400Regular",
                      fontSize: 12,
                      color: colors.gray,
                      marginTop: 2,
                    }}
                  >
                    {targetListing.condition}
                  </Text>
                )}
                <Text
                  style={{
                    fontFamily: "Inter_700Bold",
                    fontSize: 14,
                    color: colors.foreground,
                    marginTop: 4,
                  }}
                >
                  £{Number(targetListing.seller_price || 0).toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Fairness Score */}
        {offer.ai_fairness_score !== null && offer.ai_fairness_score !== undefined && (
          <View
            style={{
              backgroundColor: colors.lightGray,
              borderRadius: 8,
              padding: 10,
              marginBottom: 12,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text
                style={{
                  fontFamily: "Inter_500Medium",
                  fontSize: 13,
                  color: colors.foreground,
                }}
              >
                AI Fairness Score
              </Text>
              <Text
                style={{
                  fontFamily: "Inter_700Bold",
                  fontSize: 14,
                  color:
                    offer.ai_fairness_score >= 0.8
                      ? "#10B981"
                      : offer.ai_fairness_score >= 0.6
                      ? "#F59E0B"
                      : "#EF4444",
                }}
              >
                {Math.round(offer.ai_fairness_score * 100)}%
              </Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        {offer.status === "pending" && userRole === "seller" && !isExpired && (
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            <TouchableOpacity
              onPress={() => {
                Alert.alert("Accept Offer", "Are you sure you want to accept this trade offer?", [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Accept",
                    onPress: () => acceptMutation.mutate(offer.id),
                    style: "default",
                  },
                ]);
              }}
              disabled={acceptMutation.isPending}
              style={{
                flex: 1,
                backgroundColor: "#10B981",
                borderRadius: 8,
                paddingVertical: 12,
                alignItems: "center",
                opacity: acceptMutation.isPending ? 0.6 : 1,
              }}
            >
              {acceptMutation.isPending ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 14,
                    color: colors.background,
                  }}
                >
                  Accept
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                Alert.alert("Reject Offer", "Are you sure you want to reject this trade offer?", [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Reject",
                    onPress: () => rejectMutation.mutate(offer.id),
                    style: "destructive",
                  },
                ]);
              }}
              disabled={rejectMutation.isPending}
              style={{
                flex: 1,
                backgroundColor: "transparent",
                borderRadius: 8,
                paddingVertical: 12,
                alignItems: "center",
                borderWidth: 1,
                borderColor: colors.border,
                opacity: rejectMutation.isPending ? 0.6 : 1,
              }}
            >
              {rejectMutation.isPending ? (
                <ActivityIndicator color={colors.foreground} />
              ) : (
                <Text
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 14,
                    color: colors.foreground,
                  }}
                >
                  Reject
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* View Details Button */}
        <TouchableOpacity
          onPress={() => router.push(`/trade-offers/${offer.id}`)}
          style={{
            marginTop: 8,
            paddingVertical: 10,
            alignItems: "center",
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          <Text
            style={{
              fontFamily: "Inter_500Medium",
              fontSize: 13,
              color: colors.gray,
            }}
          >
            View Details
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="dark" />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingBottom: 12,
          paddingHorizontal: 20,
          flexDirection: "row",
          alignItems: "center",
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
          <ArrowLeft size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <ArrowLeftRight size={24} color={colors.foreground} />
          <Text style={{ fontFamily: "Inter_700Bold", fontSize: 20, color: colors.foreground }}>
            Trade Offers
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingVertical: 12,
        }}
      >
        <TouchableOpacity
          onPress={() => setTab("incoming")}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 8,
            backgroundColor: tab === "incoming" ? colors.foreground : colors.lightGray,
            marginRight: 8,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <IncomingIcon size={16} color={tab === "incoming" ? colors.background : colors.foreground} />
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 13,
                color: tab === "incoming" ? colors.background : colors.foreground,
              }}
            >
              Incoming ({incomingOffers.length})
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTab("outgoing")}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 8,
            backgroundColor: tab === "outgoing" ? colors.foreground : colors.lightGray,
            marginRight: 8,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <ArrowRight size={16} color={tab === "outgoing" ? colors.background : colors.foreground} />
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 13,
                color: tab === "outgoing" ? colors.background : colors.foreground,
              }}
            >
              Outgoing ({outgoingOffers.length})
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTab("accepted")}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 8,
            backgroundColor: tab === "accepted" ? colors.foreground : colors.lightGray,
            marginRight: 8,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <CheckCircle size={16} color={tab === "accepted" ? colors.background : colors.foreground} />
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 13,
                color: tab === "accepted" ? colors.background : colors.foreground,
              }}
            >
              Accepted ({acceptedOffers.length})
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTab("rejected")}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 8,
            backgroundColor: tab === "rejected" ? colors.foreground : colors.lightGray,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <XCircle size={16} color={tab === "rejected" ? colors.background : colors.foreground} />
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 13,
                color: tab === "rejected" ? colors.background : colors.foreground,
              }}
            >
              Rejected ({rejectedOffers.length})
            </Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* Offers List */}
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={colors.foreground} />
        </View>
      ) : !currentOffers || currentOffers.length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 40 }}>
          <Package size={64} color={colors.gray} />
          <Text
            style={{
              fontFamily: "Inter_600SemiBold",
              fontSize: 18,
              color: colors.foreground,
              marginTop: 16,
              marginBottom: 8,
            }}
          >
            No {tab === "incoming" ? "Incoming" : tab === "outgoing" ? "Outgoing" : tab} Offers
          </Text>
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 14,
              color: colors.gray,
              textAlign: "center",
            }}
          >
            {tab === "incoming"
              ? "Trade offers you receive will appear here"
              : tab === "outgoing"
              ? "Trade offers you've sent will appear here"
              : `No ${tab} trade offers yet`}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: 20,
            paddingBottom: insets.bottom + 40,
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.foreground} />
          }
          showsVerticalScrollIndicator={false}
        >
          {currentOffers.map((offer) => (
            <TradeOfferCard
              key={offer.id}
              offer={offer}
              userRole={offer.seller_id === user?.id ? "seller" : "buyer"}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

