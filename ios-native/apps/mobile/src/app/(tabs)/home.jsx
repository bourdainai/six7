import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Search, Sparkles } from "lucide-react-native";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { fetchListings } from "@/utils/supabaseClient";
import Logo from "../../../assets/images/logo.svg";
import { useQuery } from "@tanstack/react-query";

const { width: screenWidth } = Dimensions.get("window");

const colors = {
  background: "#FFFFFF",
  foreground: "#0A0A0A",
  gray: "#666666",
  lightGray: "#F8F8F8",
  border: "#E5E5E5",
};

export default function Home() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Fetch featured listings
  const { data: featuredListings, isLoading } = useQuery({
    queryKey: ["featured-listings"],
    queryFn: () => fetchListings({ limit: 6, orderBy: "created_at", ascending: false }),
  });

  // Fetch trending listings (by views or saves)
  const { data: trendingListings } = useQuery({
    queryKey: ["trending-listings"],
    queryFn: () => fetchListings({ limit: 4, orderBy: "views", ascending: false }),
  });

  if (!fontsLoaded) {
    return null;
  }

  const ListingCard = ({ listing, featured = false }) => {
    const imageUrl =
      listing.listing_images?.[0]?.image_url ||
      "https://images.pokemontcg.io/swsh4/20_hires.png";

    const cardWidth = featured
      ? screenWidth * 0.85
      : (screenWidth - 48) / 2; // 2 columns with padding

    return (
      <TouchableOpacity
        onPress={() => router.push(`/listing/${listing.id}`)}
        style={{
          width: cardWidth,
          backgroundColor: colors.background,
          borderRadius: 12,
          overflow: "hidden",
          marginRight: featured ? 12 : 0,
          marginBottom: 12,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        <View
          style={{
            width: "100%",
            aspectRatio: 0.75,
            backgroundColor: colors.lightGray,
            overflow: "hidden",
          }}
        >
          <Image
            source={{ uri: imageUrl }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        </View>
        <View style={{ padding: 12 }}>
          <Text
            numberOfLines={2}
            style={{
              fontFamily: "Inter_600SemiBold",
              fontSize: 14,
              color: colors.foreground,
              marginBottom: 4,
            }}
          >
            {listing.title}
          </Text>
          <Text
            style={{
              fontFamily: "Inter_700Bold",
              fontSize: 16,
              color: colors.foreground,
            }}
          >
            £{Number(listing.seller_price || 0).toFixed(2)}
          </Text>
          {listing.seller && (
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 12,
                color: colors.gray,
                marginTop: 4,
              }}
            >
              {listing.seller.full_name}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="dark" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 100,
        }}
      >
        {/* Header */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <Logo width={160} height={40} style={{ marginBottom: 8 }} />
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 15,
              color: colors.gray,
            }}
          >
            AI-Native Trading Marketplace
          </Text>
        </View>

        {/* Search Bar */}
        <TouchableOpacity
          onPress={() => router.push("/(tabs)/browse")}
          style={{
            marginHorizontal: 20,
            marginBottom: 32,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.lightGray,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Search size={20} color={colors.gray} />
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 15,
              color: colors.gray,
              marginLeft: 12,
              flex: 1,
            }}
          >
            Search cards, sets, sellers...
          </Text>
        </TouchableOpacity>

        {/* Hero Section */}
        <View
          style={{
            marginHorizontal: 20,
            marginBottom: 40,
            backgroundColor: colors.foreground,
            borderRadius: 16,
            padding: 24,
            minHeight: 200,
            justifyContent: "center",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <Sparkles size={24} color={colors.background} />
            <Text
              style={{
                fontFamily: "Inter_700Bold",
                fontSize: 24,
                color: colors.background,
                marginLeft: 8,
              }}
            >
              AI-Powered Trading
            </Text>
          </View>
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 15,
              color: colors.background,
              opacity: 0.9,
              lineHeight: 22,
              marginBottom: 20,
            }}
          >
            Buy, sell, and trade Pokémon cards with instant AI valuations and
            fairness scoring.
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/browse")}
            style={{
              backgroundColor: colors.background,
              paddingVertical: 12,
              paddingHorizontal: 24,
              borderRadius: 8,
              alignSelf: "flex-start",
            }}
          >
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 15,
                color: colors.foreground,
              }}
            >
              Explore Marketplace
            </Text>
          </TouchableOpacity>
        </View>

        {/* Featured Listings */}
        <View style={{ marginBottom: 32 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: 20,
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
              Featured Listings
            </Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/browse")}>
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

          {isLoading ? (
            <View style={{ paddingHorizontal: 20 }}>
              <ActivityIndicator size="large" color={colors.foreground} />
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20 }}
            >
              {featuredListings?.map((listing) => (
                <ListingCard key={listing.id} listing={listing} featured />
              ))}
            </ScrollView>
          )}
        </View>

        {/* Trending Listings */}
        {trendingListings && trendingListings.length > 0 && (
          <View style={{ marginBottom: 32 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingHorizontal: 20,
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
                Trending Now
              </Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)/browse")}>
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

            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                paddingHorizontal: 20,
                justifyContent: "space-between",
              }}
            >
              {trendingListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}


