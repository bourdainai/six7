import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { ArrowLeft, Package, CheckCircle, Clock, Truck, Star, AlertTriangle } from "lucide-react-native";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/utils/auth/useAuth";
import { format } from "date-fns";

const colors = {
  background: "#FFFFFF",
  foreground: "#0A0A0A",
  gray: "#666666",
  lightGray: "#F8F8F8",
  border: "#E5E5E5",
  warning: "#F59E0B",
  destructive: "#EF4444",
};

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState("buying"); // 'buying' or 'selling'

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Fetch buyer orders
  const { data: buyerOrders, isLoading: isLoadingBuyer, refetch: refetchBuyer } = useQuery({
    queryKey: ["orders", "buyer", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items(
            *,
            listing:listings(title, id, listing_images(image_url))
          ),
          seller:profiles!seller_id(id, full_name, avatar_url),
          shipping_details(*)
        `)
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && tab === "buying",
  });

  // Fetch seller orders
  const { data: sellerOrders, isLoading: isLoadingSeller, refetch: refetchSeller } = useQuery({
    queryKey: ["orders", "seller", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items(
            *,
            listing:listings(title, id, listing_images(image_url))
          ),
          buyer:profiles!buyer_id(id, full_name, avatar_url),
          shipping_details(*)
        `)
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && tab === "selling",
  });

  const orders = tab === "buying" ? buyerOrders : sellerOrders;
  const isLoading = tab === "buying" ? isLoadingBuyer : isLoadingSeller;

  const onRefresh = async () => {
    setRefreshing(true);
    if (tab === "buying") {
      await refetchBuyer();
    } else {
      await refetchSeller();
    }
    setRefreshing(false);
  };

  const getStatusIcon = (status, shippingStatus) => {
    if (status === "completed") return <CheckCircle size={20} color="#10B981" />;
    if (status === "paid" && shippingStatus === "delivered") return <CheckCircle size={20} color="#10B981" />;
    if (shippingStatus === "shipped" || shippingStatus === "in_transit") return <Truck size={20} color="#F59E0B" />;
    if (status === "paid") return <Package size={20} color="#3B82F6" />;
    return <Clock size={20} color={colors.gray} />;
  };

  const getStatusColor = (status, shippingStatus) => {
    if (status === "completed") return "#10B981";
    if (status === "paid" && shippingStatus === "delivered") return "#10B981";
    if (shippingStatus === "shipped" || shippingStatus === "in_transit") return "#F59E0B";
    if (status === "paid") return "#3B82F6";
    return colors.gray;
  };

  if (!fontsLoaded) {
    return null;
  }

  const OrderCard = ({ order, tab }) => {
    const firstItem = order.order_items?.[0];
    const listing = firstItem?.listing;
    const imageUrl = listing?.listing_images?.[0]?.image_url;
    const shippingDetail = order.shipping_details?.[0];
    const status = order.status;
    const shippingStatus = shippingDetail?.status || "pending";

    return (
      <TouchableOpacity
        onPress={() => router.push(`/orders/${order.id}`)}
        style={{
          backgroundColor: colors.background,
          borderRadius: 12,
          padding: 16,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <View style={{ flexDirection: "row" }}>
          {imageUrl ? (
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 8,
                backgroundColor: colors.lightGray,
                marginRight: 12,
                overflow: "hidden",
              }}
            >
              <Image source={{ uri: imageUrl }} style={{ width: 80, height: 80 }} />
            </View>
          ) : (
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 8,
                backgroundColor: colors.lightGray,
                marginRight: 12,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Package size={32} color={colors.gray} />
            </View>
          )}

          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 15,
                color: colors.foreground,
                marginBottom: 4,
              }}
              numberOfLines={2}
            >
              {listing?.title || "Order Items"}
            </Text>

            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 6 }}>
              {getStatusIcon(status, shippingStatus)}
              <Text
                style={{
                  fontFamily: "Inter_500Medium",
                  fontSize: 13,
                  color: getStatusColor(status, shippingStatus),
                  textTransform: "capitalize",
                }}
              >
                {shippingStatus !== "pending" ? shippingStatus.replace("_", " ") : status}
              </Text>
            </View>

            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
              <View>
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    fontSize: 12,
                    color: colors.gray,
                  }}
                >
                  {format(new Date(order.created_at), "MMM d, yyyy")}
                </Text>
                {order.order_items?.length > 1 && (
                  <Text
                    style={{
                      fontFamily: "Inter_400Regular",
                      fontSize: 12,
                      color: colors.gray,
                      marginTop: 2,
                    }}
                  >
                    +{order.order_items.length - 1} more item{order.order_items.length - 1 > 1 ? "s" : ""}
                  </Text>
                )}
              </View>

              <Text
                style={{
                  fontFamily: "Inter_700Bold",
                  fontSize: 16,
                  color: colors.foreground,
                }}
              >
                £{Number(order.total_amount || 0).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons for Buyers */}
        {tab === "buying" && status === "paid" && (
          <View style={{ flexDirection: "row", gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                router.push(`/orders/rate/${order.id}`);
              }}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.lightGray,
                paddingVertical: 10,
                borderRadius: 8,
                gap: 6,
              }}
            >
              <Star size={16} color={colors.warning} strokeWidth={2} />
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13, color: colors.foreground }}>
                Rate Seller
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                router.push(`/orders/dispute/${order.id}`);
              }}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: `${colors.destructive}10`,
                paddingVertical: 10,
                borderRadius: 8,
                gap: 6,
              }}
            >
              <AlertTriangle size={16} color={colors.destructive} strokeWidth={2} />
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13, color: colors.destructive }}>
                Open Dispute
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
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
        <Text style={{ fontFamily: "Inter_700Bold", fontSize: 20, color: colors.foreground }}>
          Orders
        </Text>
      </View>

      {/* Tabs */}
      <View
        style={{
          flexDirection: "row",
          paddingHorizontal: 20,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          gap: 8,
        }}
      >
        <TouchableOpacity
          onPress={() => setTab("buying")}
          style={{
            flex: 1,
            paddingVertical: 10,
            alignItems: "center",
            borderRadius: 8,
            backgroundColor: tab === "buying" ? colors.foreground : colors.lightGray,
          }}
        >
          <Text
            style={{
              fontFamily: "Inter_600SemiBold",
              fontSize: 14,
              color: tab === "buying" ? colors.background : colors.foreground,
            }}
          >
            Buying
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTab("selling")}
          style={{
            flex: 1,
            paddingVertical: 10,
            alignItems: "center",
            borderRadius: 8,
            backgroundColor: tab === "selling" ? colors.foreground : colors.lightGray,
          }}
        >
          <Text
            style={{
              fontFamily: "Inter_600SemiBold",
              fontSize: 14,
              color: tab === "selling" ? colors.background : colors.foreground,
            }}
          >
            Selling
          </Text>
        </TouchableOpacity>
      </View>

      {/* Orders List */}
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={colors.foreground} />
        </View>
      ) : !orders || orders.length === 0 ? (
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
            No {tab === "buying" ? "Purchases" : "Sales"} Yet
          </Text>
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 14,
              color: colors.gray,
              textAlign: "center",
            }}
          >
            {tab === "buying"
              ? "Your purchase history will appear here"
              : "Your sales history will appear here"}
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
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} tab={tab} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

