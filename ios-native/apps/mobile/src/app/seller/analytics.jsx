import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  ChevronLeft,
  TrendingUp,
  Eye,
  MessageSquare,
  ShoppingBag,
  DollarSign,
  Package,
  Star,
  Calendar,
} from "lucide-react-native";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useAuth } from "@/utils/auth/useAuth";
import { supabase, isSupabaseConfigured } from "@/utils/supabaseClient";

const { width: screenWidth } = Dimensions.get("window");

const colors = {
  background: "#FFFFFF",
  foreground: "#0A0A0A",
  gray: "#666666",
  lightGray: "#F8F8F8",
  border: "#E5E5E5",
  primary: "#0A0A0A",
  success: "#22C55E",
  warning: "#F59E0B",
  info: "#3B82F6",
};

// Fetch seller analytics
async function fetchSellerAnalytics(sellerId) {
  if (!isSupabaseConfigured() || !sellerId) {
    return null;
  }

  try {
    // Get listings stats
    const { data: listings, error: listingsError } = await supabase
      .from("listings")
      .select("id, views, status, seller_price, created_at")
      .eq("seller_id", sellerId);

    if (listingsError) throw listingsError;

    // Get orders (sales)
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("id, total_amount, status, created_at")
      .eq("seller_id", sellerId)
      .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (ordersError) throw ordersError;

    // Get messages count
    const { count: messageCount, error: messagesError } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("receiver_id", sellerId)
      .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    // Get seller reputation
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("trust_score, total_sales, seller_rating")
      .eq("id", sellerId)
      .single();

    // Calculate stats
    const activeListings = listings?.filter((l) => l.status === "active") || [];
    const soldListings = listings?.filter((l) => l.status === "sold") || [];
    const totalViews = listings?.reduce((sum, l) => sum + (l.views || 0), 0) || 0;
    const totalRevenue = orders
      ?.filter((o) => o.status === "completed")
      .reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
    const completedOrders = orders?.filter((o) => o.status === "completed") || [];

    // Calculate conversion rate (sales / views)
    const conversionRate = totalViews > 0
      ? ((completedOrders.length / totalViews) * 100).toFixed(1)
      : 0;

    // Get top selling items
    const topItems = soldListings
      .sort((a, b) => (b.seller_price || 0) - (a.seller_price || 0))
      .slice(0, 5);

    return {
      totalViews,
      totalListings: listings?.length || 0,
      activeListings: activeListings.length,
      soldListings: soldListings.length,
      totalRevenue,
      completedOrders: completedOrders.length,
      messageCount: messageCount || 0,
      conversionRate,
      trustScore: profile?.trust_score || 0,
      sellerRating: profile?.seller_rating || 0,
      totalSales: profile?.total_sales || 0,
      topItems,
    };
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return null;
  }
}

export default function SellerAnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (user?.id) {
      loadAnalytics();
    }
  }, [user?.id]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchSellerAnalytics(user.id);
      if (data) {
        setAnalytics(data);
      } else {
        setError("Failed to load analytics");
      }
    } catch (err) {
      setError(err.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  const StatCard = ({ icon: Icon, label, value, subValue, color = colors.foreground }) => (
    <View
      style={{
        backgroundColor: colors.lightGray,
        borderRadius: 16,
        padding: 16,
        width: (screenWidth - 64) / 2,
        marginBottom: 12,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: `${color}15`,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 12,
        }}
      >
        <Icon size={20} color={color} strokeWidth={2} />
      </View>
      <Text
        style={{
          fontFamily: "Inter_700Bold",
          fontSize: 24,
          color: colors.foreground,
          letterSpacing: -0.5,
          marginBottom: 4,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontFamily: "Inter_500Medium",
          fontSize: 13,
          color: colors.gray,
        }}
      >
        {label}
      </Text>
      {subValue && (
        <Text
          style={{
            fontFamily: "Inter_400Regular",
            fontSize: 11,
            color: color,
            marginTop: 4,
          }}
        >
          {subValue}
        </Text>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="dark" />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 24,
          paddingBottom: 16,
          backgroundColor: colors.background,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.lightGray,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 16,
          }}
        >
          <ChevronLeft size={24} color={colors.foreground} strokeWidth={2} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: "Inter_700Bold",
              fontSize: 24,
              color: colors.foreground,
              letterSpacing: -0.5,
            }}
          >
            Analytics
          </Text>
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 13,
              color: colors.gray,
              marginTop: 2,
            }}
          >
            Last 30 days performance
          </Text>
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.lightGray,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 8,
          }}
        >
          <Calendar size={14} color={colors.gray} strokeWidth={2} />
          <Text
            style={{
              fontFamily: "Inter_500Medium",
              fontSize: 12,
              color: colors.gray,
              marginLeft: 6,
            }}
          >
            30 Days
          </Text>
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator size="large" color={colors.foreground} />
          <Text
            style={{
              fontFamily: "Inter_500Medium",
              fontSize: 14,
              color: colors.gray,
              marginTop: 12,
            }}
          >
            Loading analytics...
          </Text>
        </View>
      ) : error || !analytics ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 40,
          }}
        >
          <TrendingUp size={64} color={colors.gray} strokeWidth={1.5} />
          <Text
            style={{
              fontFamily: "Inter_600SemiBold",
              fontSize: 16,
              color: colors.foreground,
              marginTop: 16,
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            Couldn't load analytics
          </Text>
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 14,
              color: colors.gray,
              textAlign: "center",
              marginBottom: 20,
            }}
          >
            {error || "Please try again"}
          </Text>
          <TouchableOpacity
            onPress={loadAnalytics}
            style={{
              backgroundColor: colors.foreground,
              paddingVertical: 12,
              paddingHorizontal: 24,
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
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 20,
            paddingBottom: insets.bottom + 24,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Performance Overview */}
          <Text
            style={{
              fontFamily: "Inter_600SemiBold",
              fontSize: 16,
              color: colors.foreground,
              marginBottom: 16,
            }}
          >
            Performance Overview
          </Text>

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "space-between",
            }}
          >
            <StatCard
              icon={Eye}
              label="Total Views"
              value={analytics.totalViews.toLocaleString()}
              color={colors.info}
            />
            <StatCard
              icon={MessageSquare}
              label="Messages"
              value={analytics.messageCount.toLocaleString()}
              color={colors.warning}
            />
            <StatCard
              icon={ShoppingBag}
              label="Orders"
              value={analytics.completedOrders.toLocaleString()}
              color={colors.success}
            />
            <StatCard
              icon={TrendingUp}
              label="Conversion"
              value={`${analytics.conversionRate}%`}
              color={colors.primary}
            />
          </View>

          {/* Revenue Section */}
          <View
            style={{
              backgroundColor: colors.primary,
              borderRadius: 16,
              padding: 20,
              marginTop: 12,
              marginBottom: 24,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <DollarSign size={20} color={colors.background} strokeWidth={2} />
              <Text
                style={{
                  fontFamily: "Inter_500Medium",
                  fontSize: 14,
                  color: colors.background,
                  marginLeft: 8,
                  opacity: 0.8,
                }}
              >
                Total Revenue (30 days)
              </Text>
            </View>
            <Text
              style={{
                fontFamily: "Inter_700Bold",
                fontSize: 36,
                color: colors.background,
                letterSpacing: -1,
              }}
            >
              £{analytics.totalRevenue.toFixed(2)}
            </Text>
          </View>

          {/* Listings Stats */}
          <Text
            style={{
              fontFamily: "Inter_600SemiBold",
              fontSize: 16,
              color: colors.foreground,
              marginBottom: 16,
            }}
          >
            Listings Overview
          </Text>

          <View
            style={{
              backgroundColor: colors.lightGray,
              borderRadius: 16,
              padding: 16,
              marginBottom: 24,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <View style={{ alignItems: "center", flex: 1 }}>
                <Text
                  style={{
                    fontFamily: "Inter_700Bold",
                    fontSize: 28,
                    color: colors.foreground,
                    letterSpacing: -0.5,
                  }}
                >
                  {analytics.totalListings}
                </Text>
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    fontSize: 12,
                    color: colors.gray,
                  }}
                >
                  Total
                </Text>
              </View>
              <View
                style={{
                  width: 1,
                  backgroundColor: colors.border,
                  marginHorizontal: 16,
                }}
              />
              <View style={{ alignItems: "center", flex: 1 }}>
                <Text
                  style={{
                    fontFamily: "Inter_700Bold",
                    fontSize: 28,
                    color: colors.success,
                    letterSpacing: -0.5,
                  }}
                >
                  {analytics.activeListings}
                </Text>
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    fontSize: 12,
                    color: colors.gray,
                  }}
                >
                  Active
                </Text>
              </View>
              <View
                style={{
                  width: 1,
                  backgroundColor: colors.border,
                  marginHorizontal: 16,
                }}
              />
              <View style={{ alignItems: "center", flex: 1 }}>
                <Text
                  style={{
                    fontFamily: "Inter_700Bold",
                    fontSize: 28,
                    color: colors.info,
                    letterSpacing: -0.5,
                  }}
                >
                  {analytics.soldListings}
                </Text>
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    fontSize: 12,
                    color: colors.gray,
                  }}
                >
                  Sold
                </Text>
              </View>
            </View>
          </View>

          {/* Trust Score */}
          <Text
            style={{
              fontFamily: "Inter_600SemiBold",
              fontSize: 16,
              color: colors.foreground,
              marginBottom: 16,
            }}
          >
            Seller Reputation
          </Text>

          <View
            style={{
              flexDirection: "row",
              gap: 12,
              marginBottom: 24,
            }}
          >
            <View
              style={{
                flex: 1,
                backgroundColor: colors.lightGray,
                borderRadius: 16,
                padding: 16,
                alignItems: "center",
              }}
            >
              <Star size={24} color={colors.warning} strokeWidth={2} fill={colors.warning} />
              <Text
                style={{
                  fontFamily: "Inter_700Bold",
                  fontSize: 24,
                  color: colors.foreground,
                  marginTop: 8,
                }}
              >
                {analytics.trustScore}%
              </Text>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 12,
                  color: colors.gray,
                }}
              >
                Trust Score
              </Text>
            </View>
            <View
              style={{
                flex: 1,
                backgroundColor: colors.lightGray,
                borderRadius: 16,
                padding: 16,
                alignItems: "center",
              }}
            >
              <Package size={24} color={colors.success} strokeWidth={2} />
              <Text
                style={{
                  fontFamily: "Inter_700Bold",
                  fontSize: 24,
                  color: colors.foreground,
                  marginTop: 8,
                }}
              >
                {analytics.totalSales}
              </Text>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 12,
                  color: colors.gray,
                }}
              >
                Total Sales
              </Text>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
