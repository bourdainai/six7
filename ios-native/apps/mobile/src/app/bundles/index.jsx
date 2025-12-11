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
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { ChevronLeft, Package, Tag } from "lucide-react-native";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
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
};

// Fetch bundles from Supabase
async function fetchBundles() {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("bundles")
      .select(`
        *,
        seller:profiles!seller_id(id, full_name, avatar_url, trust_score),
        bundle_items(
          id,
          listing:listings(
            id,
            title,
            seller_price,
            listing_images(image_url, display_order)
          )
        )
      `)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching bundles:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching bundles:", error);
    return [];
  }
}

export default function BundlesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    loadBundles();
  }, []);

  const loadBundles = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchBundles();
      setBundles(data);
    } catch (err) {
      setError(err.message || "Failed to load bundles");
    } finally {
      setLoading(false);
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  const BundleCard = ({ bundle }) => {
    const items = bundle.bundle_items || [];
    const itemCount = items.length;
    const totalValue = items.reduce((sum, item) => {
      return sum + (item.listing?.seller_price || 0);
    }, 0);
    const bundlePrice = bundle.price || totalValue * 0.9; // 10% discount if no price set
    const savings = totalValue - bundlePrice;
    const savingsPercent = totalValue > 0 ? Math.round((savings / totalValue) * 100) : 0;

    // Get first 4 images for preview
    const previewImages = items
      .slice(0, 4)
      .map((item) => item.listing?.listing_images?.[0]?.image_url)
      .filter(Boolean);

    const sellerName = bundle.seller?.full_name || "Anonymous";

    return (
      <TouchableOpacity
        onPress={() => router.push(`/bundle/${bundle.id}`)}
        style={{
          backgroundColor: colors.background,
          borderRadius: 16,
          marginBottom: 16,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 4,
          overflow: "hidden",
        }}
      >
        {/* Bundle Badge */}
        <View
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            backgroundColor: colors.primary,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 8,
            flexDirection: "row",
            alignItems: "center",
            zIndex: 1,
          }}
        >
          <Package size={14} color={colors.background} strokeWidth={2} />
          <Text
            style={{
              fontFamily: "Inter_600SemiBold",
              fontSize: 12,
              color: colors.background,
              marginLeft: 6,
            }}
          >
            {itemCount} Cards
          </Text>
        </View>

        {/* Savings Badge */}
        {savingsPercent > 0 && (
          <View
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              backgroundColor: colors.success,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 8,
              flexDirection: "row",
              alignItems: "center",
              zIndex: 1,
            }}
          >
            <Tag size={12} color={colors.background} strokeWidth={2} />
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 12,
                color: colors.background,
                marginLeft: 4,
              }}
            >
              Save {savingsPercent}%
            </Text>
          </View>
        )}

        {/* Image Grid */}
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            padding: 8,
            backgroundColor: colors.lightGray,
          }}
        >
          {previewImages.length > 0 ? (
            previewImages.map((url, index) => (
              <View
                key={index}
                style={{
                  width: "50%",
                  aspectRatio: 0.72,
                  padding: 4,
                }}
              >
                <Image
                  source={{ uri: url }}
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: 8,
                  }}
                  contentFit="contain"
                />
              </View>
            ))
          ) : (
            <View
              style={{
                width: "100%",
                height: 200,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Package size={48} color={colors.gray} strokeWidth={1.5} />
              <Text
                style={{
                  fontFamily: "Inter_500Medium",
                  fontSize: 14,
                  color: colors.gray,
                  marginTop: 8,
                }}
              >
                No preview
              </Text>
            </View>
          )}
        </View>

        {/* Bundle Info */}
        <View style={{ padding: 16 }}>
          <Text
            style={{
              fontFamily: "Inter_600SemiBold",
              fontSize: 16,
              color: colors.foreground,
              marginBottom: 8,
            }}
            numberOfLines={2}
          >
            {bundle.title || `Bundle of ${itemCount} Cards`}
          </Text>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 13,
                color: colors.gray,
              }}
            >
              By {sellerName}
            </Text>
            {bundle.seller?.trust_score && (
              <>
                <View
                  style={{
                    width: 3,
                    height: 3,
                    borderRadius: 1.5,
                    backgroundColor: colors.gray,
                    marginHorizontal: 8,
                  }}
                />
                <Text
                  style={{
                    fontFamily: "Inter_500Medium",
                    fontSize: 13,
                    color: colors.success,
                  }}
                >
                  {bundle.seller.trust_score}% Trust
                </Text>
              </>
            )}
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "baseline",
              justifyContent: "space-between",
            }}
          >
            <View>
              <Text
                style={{
                  fontFamily: "Inter_700Bold",
                  fontSize: 24,
                  color: colors.foreground,
                  letterSpacing: -0.5,
                }}
              >
                £{bundlePrice.toFixed(2)}
              </Text>
              {savings > 0 && (
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    fontSize: 13,
                    color: colors.gray,
                    textDecorationLine: "line-through",
                  }}
                >
                  £{totalValue.toFixed(2)}
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={{
                backgroundColor: colors.primary,
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderRadius: 10,
              }}
            >
              <Text
                style={{
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 14,
                  color: colors.background,
                }}
              >
                View Bundle
              </Text>
            </TouchableOpacity>
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
            Bundles
          </Text>
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 13,
              color: colors.gray,
              marginTop: 2,
            }}
          >
            Save money with curated card bundles
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
            Loading bundles...
          </Text>
        </View>
      ) : error ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 40,
          }}
        >
          <Text
            style={{
              fontFamily: "Inter_600SemiBold",
              fontSize: 16,
              color: colors.foreground,
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            Couldn't load bundles
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
            {error}
          </Text>
          <TouchableOpacity
            onPress={loadBundles}
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
      ) : bundles.length === 0 ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 40,
          }}
        >
          <Package size={64} color={colors.gray} strokeWidth={1.5} />
          <Text
            style={{
              fontFamily: "Inter_600SemiBold",
              fontSize: 18,
              color: colors.foreground,
              marginTop: 16,
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            No bundles yet
          </Text>
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 14,
              color: colors.gray,
              textAlign: "center",
            }}
          >
            Check back soon for curated card bundles with special discounts
          </Text>
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
          {bundles.map((bundle) => (
            <BundleCard key={bundle.id} bundle={bundle} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}
