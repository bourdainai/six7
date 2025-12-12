import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  ArrowLeftRight,
  Package,
  User,
  Clock,
  CheckCircle,
  XCircle,
  MessageCircle,
  ChevronRight,
} from "lucide-react-native";
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
import { format, formatDistanceToNow } from "date-fns";

const colors = {
  background: "#FFFFFF",
  foreground: "#0A0A0A",
  gray: "#666666",
  lightGray: "#F8F8F8",
  border: "#E5E5E5",
  green: "#10B981",
  red: "#EF4444",
  amber: "#F59E0B",
};

export default function TradeOfferDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id: offerId } = useLocalSearchParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [counterAmount, setCounterAmount] = useState("");

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Fetch trade offer details
  const { data: offer, isLoading } = useQuery({
    queryKey: ["trade-offer", offerId],
    queryFn: async () => {
      if (!offerId) return null;

      const { data, error } = await supabase
        .from("trade_offers")
        .select(`
          *,
          target_listing:listings(
            id,
            title,
            seller_price,
            condition,
            listing_images(image_url, display_order)
          ),
          buyer:profiles!buyer_id(id, full_name, avatar_url, trust_score),
          seller:profiles!seller_id(id, full_name, avatar_url, trust_score)
        `)
        .eq("id", offerId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!offerId,
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("trade-accept", {
        body: { offerId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trade-offer", offerId] });
      queryClient.invalidateQueries({ queryKey: ["trade-offers"] });
      Alert.alert("Success", "Trade offer accepted!");
    },
    onError: (error) => {
      Alert.alert("Error", error.message || "Failed to accept offer");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("trade-reject", {
        body: { offerId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trade-offer", offerId] });
      queryClient.invalidateQueries({ queryKey: ["trade-offers"] });
      Alert.alert("Rejected", "Trade offer has been rejected");
      router.back();
    },
    onError: (error) => {
      Alert.alert("Error", error.message || "Failed to reject offer");
    },
  });

  const handleAccept = () => {
    Alert.alert(
      "Accept Trade",
      "Are you sure you want to accept this trade offer?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Accept", onPress: () => acceptMutation.mutate() },
      ]
    );
  };

  const handleReject = () => {
    Alert.alert(
      "Reject Trade",
      "Are you sure you want to reject this trade offer?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Reject", style: "destructive", onPress: () => rejectMutation.mutate() },
      ]
    );
  };

  if (!fontsLoaded) {
    return null;
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={colors.foreground} />
      </View>
    );
  }

  if (!offer) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        <StatusBar style="dark" />
        <View style={{ paddingHorizontal: 20, paddingVertical: 12, flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.foreground} />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 40 }}>
          <ArrowLeftRight size={64} color={colors.gray} />
          <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 18, color: colors.foreground, marginTop: 16 }}>
            Trade Offer Not Found
          </Text>
        </View>
      </View>
    );
  }

  const isSeller = user?.id === offer.seller_id;
  const isBuyer = user?.id === offer.buyer_id;
  const otherUser = isSeller ? offer.buyer : offer.seller;
  const tradeItems = offer.trade_items || [];
  const valuations = offer.trade_item_valuations || [];
  const totalOfferedValue = valuations.reduce((sum, item) => sum + (item.valuation || 0), 0) + (offer.cash_amount || 0);
  const targetListing = offer.target_listing;
  const targetValue = targetListing?.seller_price || 0;
  const targetImageUrl = targetListing?.listing_images?.sort((a, b) => a.display_order - b.display_order)?.[0]?.image_url;
  const isExpired = offer.expiry_date && new Date(offer.expiry_date) < new Date();
  const canRespond = isSeller && offer.status === "pending" && !isExpired;

  const getStatusColor = () => {
    if (isExpired) return colors.gray;
    switch (offer.status) {
      case "accepted": return colors.green;
      case "rejected": return colors.red;
      case "countered": return colors.amber;
      default: return colors.foreground;
    }
  };

  const getStatusIcon = () => {
    if (isExpired) return <Clock size={20} color={colors.gray} />;
    switch (offer.status) {
      case "accepted": return <CheckCircle size={20} color={colors.green} />;
      case "rejected": return <XCircle size={20} color={colors.red} />;
      default: return <ArrowLeftRight size={20} color={colors.foreground} />;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="dark" />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 20,
          paddingBottom: 12,
          flexDirection: "row",
          alignItems: "center",
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
          <ArrowLeft size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: "Inter_700Bold", fontSize: 18, color: colors.foreground }}>
            Trade Offer
          </Text>
        </View>
        <View
          style={{
            backgroundColor: getStatusColor() + "20",
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 8,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
        >
          {getStatusIcon()}
          <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13, color: getStatusColor(), textTransform: "capitalize" }}>
            {isExpired ? "Expired" : offer.status}
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + (canRespond ? 120 : 40) }}
        showsVerticalScrollIndicator={false}
      >
        {/* Timestamp */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 20 }}>
          <Clock size={14} color={colors.gray} />
          <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: colors.gray }}>
            Created {formatDistanceToNow(new Date(offer.created_at), { addSuffix: true })}
          </Text>
        </View>

        {/* Other User */}
        <TouchableOpacity
          onPress={() => router.push(`/profile/${otherUser?.id}`)}
          style={{
            backgroundColor: colors.lightGray,
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: colors.foreground,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
              overflow: "hidden",
            }}
          >
            {otherUser?.avatar_url ? (
              <Image source={{ uri: otherUser.avatar_url }} style={{ width: 48, height: 48 }} />
            ) : (
              <User size={24} color={colors.background} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.gray }}>
              {isSeller ? "From" : "To"}
            </Text>
            <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 16, color: colors.foreground }}>
              {otherUser?.full_name || "Unknown"}
            </Text>
          </View>
          <ChevronRight size={20} color={colors.gray} />
        </TouchableOpacity>

        {/* What's Being Offered */}
        <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 16, color: colors.foreground, marginBottom: 12 }}>
          {isSeller ? "They're Offering" : "You're Offering"}
        </Text>

        {tradeItems.map((item, idx) => (
          <View
            key={idx}
            style={{
              backgroundColor: colors.lightGray,
              borderRadius: 12,
              padding: 14,
              marginBottom: 10,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Package size={20} color={colors.foreground} style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: colors.foreground }}>
                {item.title || `Item ${idx + 1}`}
              </Text>
              {valuations?.[idx]?.valuation && (
                <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: colors.gray, marginTop: 2 }}>
                  Valued at £{valuations[idx].valuation.toFixed(2)}
                </Text>
              )}
            </View>
          </View>
        ))}

        {offer.cash_amount > 0 && (
          <View
            style={{
              backgroundColor: colors.green + "15",
              borderRadius: 12,
              padding: 14,
              marginBottom: 10,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 16, color: colors.green, flex: 1 }}>
              + £{Number(offer.cash_amount).toFixed(2)} Cash
            </Text>
          </View>
        )}

        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingTop: 12,
            marginTop: 8,
            marginBottom: 24,
          }}
        >
          <Text style={{ fontFamily: "Inter_700Bold", fontSize: 16, color: colors.foreground }}>
            Total Value: £{totalOfferedValue.toFixed(2)}
          </Text>
        </View>

        {/* What They Want */}
        <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 16, color: colors.foreground, marginBottom: 12 }}>
          {isSeller ? "For Your" : "In Exchange For"}
        </Text>

        {targetListing && (
          <TouchableOpacity
            onPress={() => router.push(`/listing/${targetListing.id}`)}
            style={{
              backgroundColor: colors.lightGray,
              borderRadius: 12,
              padding: 12,
              flexDirection: "row",
              marginBottom: 20,
            }}
          >
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 8,
                backgroundColor: colors.border,
                overflow: "hidden",
                marginRight: 12,
              }}
            >
              {targetImageUrl ? (
                <Image source={{ uri: targetImageUrl }} style={{ width: 80, height: 80 }} resizeMode="cover" />
              ) : (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                  <Package size={28} color={colors.gray} />
                </View>
              )}
            </View>
            <View style={{ flex: 1, justifyContent: "center" }}>
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 15, color: colors.foreground }} numberOfLines={2}>
                {targetListing.title}
              </Text>
              {targetListing.condition && (
                <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: colors.gray, marginTop: 4 }}>
                  {targetListing.condition}
                </Text>
              )}
              <Text style={{ fontFamily: "Inter_700Bold", fontSize: 16, color: colors.foreground, marginTop: 6 }}>
                £{Number(targetListing.seller_price || 0).toFixed(2)}
              </Text>
            </View>
            <ChevronRight size={20} color={colors.gray} style={{ alignSelf: "center" }} />
          </TouchableOpacity>
        )}

        {/* AI Fairness Score */}
        {offer.ai_fairness_score !== null && offer.ai_fairness_score !== undefined && (
          <View
            style={{
              backgroundColor: colors.lightGray,
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
            }}
          >
            <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.foreground, marginBottom: 8 }}>
              AI Fairness Analysis
            </Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: colors.gray }}>
                Trade Fairness Score
              </Text>
              <Text
                style={{
                  fontFamily: "Inter_700Bold",
                  fontSize: 18,
                  color: offer.ai_fairness_score >= 0.8 ? colors.green : offer.ai_fairness_score >= 0.6 ? colors.amber : colors.red,
                }}
              >
                {Math.round(offer.ai_fairness_score * 100)}%
              </Text>
            </View>
            <View
              style={{
                height: 8,
                backgroundColor: colors.border,
                borderRadius: 4,
                marginTop: 8,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  height: 8,
                  width: `${offer.ai_fairness_score * 100}%`,
                  backgroundColor: offer.ai_fairness_score >= 0.8 ? colors.green : offer.ai_fairness_score >= 0.6 ? colors.amber : colors.red,
                  borderRadius: 4,
                }}
              />
            </View>
          </View>
        )}

        {/* Message */}
        {offer.message && (
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.foreground, marginBottom: 8 }}>
              Message
            </Text>
            <View style={{ backgroundColor: colors.lightGray, borderRadius: 12, padding: 14 }}>
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: colors.gray, lineHeight: 20 }}>
                {offer.message}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      {canRespond && (
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: colors.background,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: insets.bottom + 16,
            flexDirection: "row",
            gap: 12,
          }}
        >
          <TouchableOpacity
            onPress={handleReject}
            disabled={rejectMutation.isPending}
            style={{
              flex: 1,
              paddingVertical: 14,
              alignItems: "center",
              borderRadius: 8,
              borderWidth: 1,
              borderColor: colors.border,
              opacity: rejectMutation.isPending ? 0.6 : 1,
            }}
          >
            {rejectMutation.isPending ? (
              <ActivityIndicator color={colors.foreground} />
            ) : (
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 15, color: colors.foreground }}>
                Reject
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleAccept}
            disabled={acceptMutation.isPending}
            style={{
              flex: 1,
              paddingVertical: 14,
              alignItems: "center",
              borderRadius: 8,
              backgroundColor: colors.green,
              opacity: acceptMutation.isPending ? 0.6 : 1,
            }}
          >
            {acceptMutation.isPending ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 15, color: colors.background }}>
                Accept Trade
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
