import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Package,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Plus,
  Edit,
  Trash2,
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
import { format } from "date-fns";

const colors = {
  background: "#FFFFFF",
  foreground: "#0A0A0A",
  gray: "#666666",
  lightGray: "#F8F8F8",
  border: "#E5E5E5",
};

export default function SellerDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState("overview"); // 'overview', 'listings', 'orders'

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Fetch seller balance
  const { data: balance } = useQuery({
    queryKey: ["seller-balance", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("seller_balances")
        .select("*")
        .eq("seller_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }
      return data || { available_balance: 0, pending_balance: 0, currency: "GBP" };
    },
    enabled: !!user?.id,
  });

  // Fetch listings
  const { data: listings, isLoading: listingsLoading, refetch: refetchListings } = useQuery({
    queryKey: ["seller-listings", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("listings")
        .select(`
          *,
          listing_images(image_url, display_order)
        `)
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && (tab === "overview" || tab === "listings"),
  });

  // Fetch seller orders
  const { data: sellerOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ["orders", "seller", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items(
            *,
            listing:listings(title, listing_images(image_url))
          ),
          buyer:profiles!buyer_id(id, full_name)
        `)
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && (tab === "overview" || tab === "orders"),
  });

  const deleteListingMutation = useMutation({
    mutationFn: async (listingId) => {
      const { error } = await supabase.from("listings").delete().eq("id", listingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller-listings"] });
      Alert.alert("Success", "Listing deleted successfully");
    },
    onError: (error) => {
      Alert.alert("Error", error.message || "Failed to delete listing");
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchListings()]);
    setRefreshing(false);
  };

  const activeListings = listings?.filter((l) => l.status === "active").length || 0;
  const totalSales =
    sellerOrders?.reduce((sum, order) => sum + Number(order.seller_amount || 0), 0) || 0;
  const totalOrders = sellerOrders?.length || 0;

  if (!fontsLoaded) {
    return null;
  }

  const StatCard = ({ icon: Icon, title, value, subtitle, color }) => (
    <View
      style={{
        backgroundColor: colors.lightGray,
        borderRadius: 12,
        padding: 16,
        flex: 1,
        minWidth: "48%",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 8 }}>
        <Icon size={20} color={color || colors.foreground} />
        <Text
          style={{
            fontFamily: "Inter_500Medium",
            fontSize: 13,
            color: colors.gray,
          }}
        >
          {title}
        </Text>
      </View>
      <Text
        style={{
          fontFamily: "Inter_700Bold",
          fontSize: 24,
          color: colors.foreground,
          marginBottom: 4,
        }}
      >
        {value}
      </Text>
      {subtitle && (
        <Text
          style={{
            fontFamily: "Inter_400Regular",
            fontSize: 12,
            color: colors.gray,
          }}
        >
          {subtitle}
        </Text>
      )}
    </View>
  );

  const ListingCard = ({ listing }) => {
    const imageUrl = listing.listing_images?.[0]?.image_url;

    return (
      <TouchableOpacity
        onPress={() => router.push(`/listing/${listing.id}`)}
        style={{
          backgroundColor: colors.background,
          borderRadius: 12,
          padding: 12,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: colors.border,
          flexDirection: "row",
        }}
      >
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
            {listing.title}
          </Text>
          <Text
            style={{
              fontFamily: "Inter_700Bold",
              fontSize: 16,
              color: colors.foreground,
              marginBottom: 4,
            }}
          >
            £{Number(listing.seller_price || 0).toFixed(2)}
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginTop: 4,
            }}
          >
            <View
              style={{
                backgroundColor:
                  listing.status === "active"
                    ? "#10B98120"
                    : listing.status === "sold"
                    ? "#3B82F620"
                    : colors.lightGray,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 4,
              }}
            >
              <Text
                style={{
                  fontFamily: "Inter_500Medium",
                  fontSize: 11,
                  color:
                    listing.status === "active"
                      ? "#10B981"
                      : listing.status === "sold"
                      ? "#3B82F6"
                      : colors.gray,
                  textTransform: "capitalize",
                }}
              >
                {listing.status}
              </Text>
            </View>
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 12,
                color: colors.gray,
              }}
            >
              {format(new Date(listing.created_at), "MMM d, yyyy")}
            </Text>
          </View>
        </View>
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
          Seller Dashboard
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
          onPress={() => setTab("overview")}
          style={{
            flex: 1,
            paddingVertical: 10,
            alignItems: "center",
            borderRadius: 8,
            backgroundColor: tab === "overview" ? colors.foreground : colors.lightGray,
          }}
        >
          <Text
            style={{
              fontFamily: "Inter_600SemiBold",
              fontSize: 14,
              color: tab === "overview" ? colors.background : colors.foreground,
            }}
          >
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTab("listings")}
          style={{
            flex: 1,
            paddingVertical: 10,
            alignItems: "center",
            borderRadius: 8,
            backgroundColor: tab === "listings" ? colors.foreground : colors.lightGray,
          }}
        >
          <Text
            style={{
              fontFamily: "Inter_600SemiBold",
              fontSize: 14,
              color: tab === "listings" ? colors.background : colors.foreground,
            }}
          >
            Listings
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTab("orders")}
          style={{
            flex: 1,
            paddingVertical: 10,
            alignItems: "center",
            borderRadius: 8,
            backgroundColor: tab === "orders" ? colors.foreground : colors.lightGray,
          }}
        >
          <Text
            style={{
              fontFamily: "Inter_600SemiBold",
              fontSize: 14,
              color: tab === "orders" ? colors.background : colors.foreground,
            }}
          >
            Orders
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 20,
          paddingBottom: insets.bottom + 100,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.foreground} />
        }
        showsVerticalScrollIndicator={false}
      >
        {tab === "overview" && (
          <>
            {/* Stats */}
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 12,
                marginBottom: 24,
              }}
            >
              <StatCard
                icon={Package}
                title="Active Listings"
                value={activeListings}
                color={colors.foreground}
              />
              <StatCard
                icon={DollarSign}
                title="Total Sales"
                value={`£${totalSales.toFixed(2)}`}
                color="#10B981"
              />
              <StatCard
                icon={ShoppingCart}
                title="Total Orders"
                value={totalOrders}
                color={colors.foreground}
              />
              <StatCard
                icon={TrendingUp}
                title="Available"
                value={`£${(balance?.available_balance || 0).toFixed(2)}`}
                subtitle={`£${(balance?.pending_balance || 0).toFixed(2)} pending`}
                color="#10B981"
              />
            </View>

            {/* Recent Listings */}
            <View style={{ marginBottom: 24 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{
                    fontFamily: "Inter_700Bold",
                    fontSize: 18,
                    color: colors.foreground,
                  }}
                >
                  Recent Listings
                </Text>
                <TouchableOpacity onPress={() => setTab("listings")}>
                  <Text
                    style={{
                      fontFamily: "Inter_500Medium",
                      fontSize: 14,
                      color: colors.gray,
                    }}
                  >
                    See All
                  </Text>
                </TouchableOpacity>
              </View>

              {listingsLoading ? (
                <ActivityIndicator size="large" color={colors.foreground} style={{ marginVertical: 20 }} />
              ) : listings && listings.length > 0 ? (
                listings.slice(0, 3).map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))
              ) : (
                <View
                  style={{
                    backgroundColor: colors.lightGray,
                    borderRadius: 12,
                    padding: 32,
                    alignItems: "center",
                  }}
                >
                  <Package size={48} color={colors.gray} />
                  <Text
                    style={{
                      fontFamily: "Inter_500Medium",
                      fontSize: 15,
                      color: colors.gray,
                      marginTop: 16,
                    }}
                  >
                    No listings yet
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.push("/(tabs)/sell")}
                    style={{
                      marginTop: 16,
                      paddingVertical: 10,
                      paddingHorizontal: 20,
                      backgroundColor: colors.foreground,
                      borderRadius: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 14,
                        color: colors.background,
                      }}
                    >
                      Create Listing
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </>
        )}

        {tab === "listings" && (
          <>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  fontFamily: "Inter_700Bold",
                  fontSize: 20,
                  color: colors.foreground,
                }}
              >
                My Listings
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/sell")}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: colors.foreground,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 8,
                  gap: 6,
                }}
              >
                <Plus size={18} color={colors.background} />
                <Text
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 14,
                    color: colors.background,
                  }}
                >
                  New
                </Text>
              </TouchableOpacity>
            </View>

            {listingsLoading ? (
              <ActivityIndicator size="large" color={colors.foreground} style={{ marginVertical: 40 }} />
            ) : listings && listings.length > 0 ? (
              listings.map((listing) => <ListingCard key={listing.id} listing={listing} />)
            ) : (
              <View
                style={{
                  backgroundColor: colors.lightGray,
                  borderRadius: 12,
                  padding: 32,
                  alignItems: "center",
                }}
              >
                <Package size={48} color={colors.gray} />
                <Text
                  style={{
                    fontFamily: "Inter_500Medium",
                    fontSize: 15,
                    color: colors.gray,
                    marginTop: 16,
                  }}
                >
                  No listings yet
                </Text>
              </View>
            )}
          </>
        )}

        {tab === "orders" && (
          <>
            <Text
              style={{
                fontFamily: "Inter_700Bold",
                fontSize: 20,
                color: colors.foreground,
                marginBottom: 16,
              }}
            >
              Sales Orders
            </Text>

            {ordersLoading ? (
              <ActivityIndicator size="large" color={colors.foreground} style={{ marginVertical: 40 }} />
            ) : sellerOrders && sellerOrders.length > 0 ? (
              sellerOrders.map((order) => (
                <TouchableOpacity
                  key={order.id}
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
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                    <Text
                      style={{
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 15,
                        color: colors.foreground,
                      }}
                    >
                      {order.order_items?.[0]?.listing?.title || "Order"}
                    </Text>
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
                  <Text
                    style={{
                      fontFamily: "Inter_400Regular",
                      fontSize: 12,
                      color: colors.gray,
                    }}
                  >
                    {format(new Date(order.created_at), "MMM d, yyyy")} • {order.buyer?.full_name || "Buyer"}
                  </Text>
                  <View
                    style={{
                      marginTop: 8,
                      alignSelf: "flex-start",
                      backgroundColor:
                        order.status === "paid"
                          ? "#10B98120"
                          : order.status === "completed"
                          ? "#3B82F620"
                          : colors.lightGray,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Inter_500Medium",
                        fontSize: 11,
                        color:
                          order.status === "paid"
                            ? "#10B981"
                            : order.status === "completed"
                            ? "#3B82F6"
                            : colors.gray,
                        textTransform: "capitalize",
                      }}
                    >
                      {order.status}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View
                style={{
                  backgroundColor: colors.lightGray,
                  borderRadius: 12,
                  padding: 32,
                  alignItems: "center",
                }}
              >
                <ShoppingCart size={48} color={colors.gray} />
                <Text
                  style={{
                    fontFamily: "Inter_500Medium",
                    fontSize: 15,
                    color: colors.gray,
                    marginTop: 16,
                  }}
                >
                  No orders yet
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

