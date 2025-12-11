import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  Package,
  Tag,
  User,
  Star,
  ShoppingBag,
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
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/utils/auth/useAuth";

const { width: screenWidth } = Dimensions.get("window");

const colors = {
  background: "#FFFFFF",
  foreground: "#0A0A0A",
  gray: "#666666",
  lightGray: "#F8F8F8",
  border: "#E5E5E5",
  green: "#10B981",
  red: "#EF4444",
};

export default function BundleDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id: bundleId } = useLocalSearchParams();
  const { user } = useAuth();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Fetch bundle details
  const { data: bundle, isLoading } = useQuery({
    queryKey: ["bundle", bundleId],
    queryFn: async () => {
      if (!bundleId) return null;

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
              condition,
              listing_images(image_url, display_order)
            )
          )
        `)
        .eq("id", bundleId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!bundleId,
  });

  const handleBuy = () => {
    if (!user) {
      Alert.alert("Sign In Required", "Please sign in to purchase this bundle");
      return;
    }

    if (bundle?.seller_id === user.id) {
      Alert.alert("Cannot Purchase", "You cannot buy your own bundle");
      return;
    }

    // Navigate to checkout with bundle
    router.push(`/checkout/${bundleId}?type=bundle`);
  };

  const handleContact = async () => {
    if (!user) {
      Alert.alert("Sign In Required", "Please sign in to contact the seller");
      return;
    }

    if (!bundle) return;

    if (bundle.seller_id === user.id) {
      Alert.alert("Cannot Contact", "This is your own bundle");
      return;
    }

    // Navigate to messages
    router.push(`/(tabs)/messages`);
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

  if (!bundle) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        <StatusBar style="dark" />
        <View style={{ paddingHorizontal: 20, paddingVertical: 12, flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.foreground} />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 40 }}>
          <Package size={64} color={colors.gray} />
          <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 18, color: colors.foreground, marginTop: 16 }}>
            Bundle Not Found
          </Text>
        </View>
      </View>
    );
  }

  const items = bundle.bundle_items || [];
  const itemCount = items.length;
  const totalValue = items.reduce((sum, item) => sum + (item.listing?.seller_price || 0), 0);
  const bundlePrice = bundle.price || totalValue * 0.9;
  const savings = totalValue - bundlePrice;
  const savingsPercent = totalValue > 0 ? Math.round((savings / totalValue) * 100) : 0;

  // Get all images from bundle items
  const allImages = items.flatMap((item) =>
    (item.listing?.listing_images || [])
      .sort((a, b) => a.display_order - b.display_order)
      .map((img) => ({ ...img, listingTitle: item.listing?.title }))
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="dark" />

      {/* Header */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 8,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "rgba(255,255,255,0.9)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ArrowLeft size={24} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Image Gallery */}
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
            setSelectedImageIndex(index);
          }}
        >
          {allImages.length > 0 ? (
            allImages.map((image, index) => (
              <Image
                key={index}
                source={{ uri: image.image_url }}
                style={{ width: screenWidth, height: screenWidth }}
                resizeMode="cover"
              />
            ))
          ) : (
            <View
              style={{
                width: screenWidth,
                height: screenWidth,
                backgroundColor: colors.lightGray,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Package size={64} color={colors.gray} />
            </View>
          )}
        </ScrollView>

        {/* Image Indicators */}
        {allImages.length > 1 && (
          <View style={{ flexDirection: "row", justifyContent: "center", paddingVertical: 12, gap: 6 }}>
            {allImages.map((_, index) => (
              <View
                key={index}
                style={{
                  width: index === selectedImageIndex ? 20 : 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: index === selectedImageIndex ? colors.foreground : colors.border,
                }}
              />
            ))}
          </View>
        )}

        {/* Bundle Badge */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
            <View
              style={{
                backgroundColor: colors.foreground,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Package size={14} color={colors.background} />
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 12, color: colors.background, marginLeft: 6 }}>
                {itemCount} Cards
              </Text>
            </View>
            {savingsPercent > 0 && (
              <View
                style={{
                  backgroundColor: colors.green,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Tag size={14} color={colors.background} />
                <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 12, color: colors.background, marginLeft: 6 }}>
                  Save {savingsPercent}%
                </Text>
              </View>
            )}
          </View>

          {/* Title & Price */}
          <Text style={{ fontFamily: "Inter_700Bold", fontSize: 24, color: colors.foreground, marginBottom: 8 }}>
            {bundle.title || `Bundle of ${itemCount} Cards`}
          </Text>

          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 12, marginBottom: 20 }}>
            <Text style={{ fontFamily: "Inter_700Bold", fontSize: 28, color: colors.foreground }}>
              £{bundlePrice.toFixed(2)}
            </Text>
            {savings > 0 && (
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 18,
                  color: colors.gray,
                  textDecorationLine: "line-through",
                }}
              >
                £{totalValue.toFixed(2)}
              </Text>
            )}
          </View>

          {/* Description */}
          {bundle.description && (
            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 15, color: colors.gray, lineHeight: 22, marginBottom: 20 }}>
              {bundle.description}
            </Text>
          )}

          {/* Seller */}
          <TouchableOpacity
            onPress={() => router.push(`/profile/${bundle.seller?.id}`)}
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
              {bundle.seller?.avatar_url ? (
                <Image source={{ uri: bundle.seller.avatar_url }} style={{ width: 48, height: 48 }} />
              ) : (
                <User size={24} color={colors.background} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 16, color: colors.foreground }}>
                {bundle.seller?.full_name || "Seller"}
              </Text>
              {bundle.seller?.trust_score && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                  <Star size={14} color={colors.foreground} fill={colors.foreground} />
                  <Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: colors.foreground }}>
                    {bundle.seller.trust_score}% Trust Score
                  </Text>
                </View>
              )}
            </View>
            <ChevronRight size={20} color={colors.gray} />
          </TouchableOpacity>

          {/* Items in Bundle */}
          <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 16, color: colors.foreground, marginBottom: 12 }}>
            Cards in this Bundle
          </Text>
          {items.map((item, index) => {
            const listing = item.listing;
            const imageUrl = listing?.listing_images?.sort((a, b) => a.display_order - b.display_order)?.[0]?.image_url;

            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => router.push(`/listing/${listing?.id}`)}
                style={{
                  flexDirection: "row",
                  backgroundColor: colors.lightGray,
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 10,
                }}
              >
                <View
                  style={{
                    width: 70,
                    height: 70,
                    borderRadius: 8,
                    backgroundColor: colors.border,
                    overflow: "hidden",
                    marginRight: 12,
                  }}
                >
                  {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={{ width: 70, height: 70 }} resizeMode="cover" />
                  ) : (
                    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                      <Package size={24} color={colors.gray} />
                    </View>
                  )}
                </View>
                <View style={{ flex: 1, justifyContent: "center" }}>
                  <Text
                    style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: colors.foreground }}
                    numberOfLines={2}
                  >
                    {listing?.title || `Item ${index + 1}`}
                  </Text>
                  {listing?.condition && (
                    <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.gray, marginTop: 4 }}>
                      {listing.condition}
                    </Text>
                  )}
                  <Text style={{ fontFamily: "Inter_700Bold", fontSize: 14, color: colors.foreground, marginTop: 4 }}>
                    £{Number(listing?.seller_price || 0).toFixed(2)}
                  </Text>
                </View>
                <ChevronRight size={20} color={colors.gray} style={{ alignSelf: "center" }} />
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
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
          onPress={handleContact}
          style={{
            width: 50,
            height: 50,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <MessageCircle size={22} color={colors.foreground} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleBuy}
          style={{
            flex: 1,
            paddingVertical: 14,
            alignItems: "center",
            borderRadius: 8,
            backgroundColor: colors.foreground,
            flexDirection: "row",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <ShoppingBag size={20} color={colors.background} />
          <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 15, color: colors.background }}>
            Buy Bundle - £{bundlePrice.toFixed(2)}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
