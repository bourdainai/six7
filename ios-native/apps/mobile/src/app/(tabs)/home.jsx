import React, { useState, useCallback, memo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Search, Sparkles, Package } from "lucide-react-native";
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
import { useAppColors } from "@/theme/useAppColors";
import haptics from "@/utils/haptics";
import EmptyState from "@/components/EmptyState";

const { width: screenWidth } = Dimensions.get("window");

// Memoized Featured Listing Card
const FeaturedListingCard = memo(({ listing, onPress }) => {
  const colors = useAppColors();
  const cardWidth = screenWidth * 0.85;

  const imageUrl = listing.listing_images?.sort(
    (a, b) => (a.display_order || 0) - (b.display_order || 0)
  )?.[0]?.image_url;

  const handlePress = useCallback(() => {
    haptics.lightTap();
    onPress?.(listing);
  }, [listing, onPress]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityLabel={`${listing.title}, £${Number(listing.seller_price || 0).toFixed(2)}`}
      accessibilityRole="button"
      style={{
        width: cardWidth,
        backgroundColor: colors.background,
        borderRadius: 12,
        overflow: "hidden",
        marginRight: 12,
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
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Package size={40} color={colors.gray} />
          </View>
        )}
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
});

FeaturedListingCard.displayName = "FeaturedListingCard";

// Memoized Grid Listing Card
const GridListingCard = memo(({ listing, onPress }) => {
  const colors = useAppColors();
  const cardWidth = (screenWidth - 48) / 2;

  const imageUrl = listing.listing_images?.sort(
    (a, b) => (a.display_order || 0) - (b.display_order || 0)
  )?.[0]?.image_url;

  const handlePress = useCallback(() => {
    haptics.lightTap();
    onPress?.(listing);
  }, [listing, onPress]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityLabel={`${listing.title}, £${Number(listing.seller_price || 0).toFixed(2)}`}
      accessibilityRole="button"
      style={{
        width: cardWidth,
        backgroundColor: colors.background,
        borderRadius: 12,
        overflow: "hidden",
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
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Package size={32} color={colors.gray} />
          </View>
        )}
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
      </View>
    </TouchableOpacity>
  );
});

GridListingCard.displayName = "GridListingCard";

export default function Home() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useAppColors();
  const [refreshing, setRefreshing] = useState(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Fetch featured listings
  const { data: featuredListings, isLoading, refetch } = useQuery({
    queryKey: ["featured-listings"],
    queryFn: () => fetchListings({ limit: 6, orderBy: "created_at", ascending: false }),
  });

  // Fetch trending listings (by views or saves)
  const { data: trendingListings, refetch: refetchTrending } = useQuery({
    queryKey: ["trending-listings"],
    queryFn: () => fetchListings({ limit: 4, orderBy: "views", ascending: false }),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    haptics.lightTap();
    await Promise.all([refetch(), refetchTrending()]);
    setRefreshing(false);
  }, [refetch, refetchTrending]);

  const handleListingPress = useCallback(
    (listing) => {
      router.push(`/listing/${listing.id}`);
    },
    [router]
  );

  const handleSearchPress = useCallback(() => {
    haptics.lightTap();
    router.push("/(tabs)/browse");
  }, [router]);

  const handleExplorePress = useCallback(() => {
    haptics.mediumTap();
    router.push("/(tabs)/browse");
  }, [router]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={colors.isDark ? "light" : "dark"} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 100,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.foreground}
          />
        }
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
          onPress={handleSearchPress}
          accessibilityLabel="Search cards, sets, sellers"
          accessibilityRole="search"
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
            onPress={handleExplorePress}
            accessibilityLabel="Explore marketplace"
            accessibilityRole="button"
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
            <TouchableOpacity
              onPress={handleSearchPress}
              accessibilityLabel="See all listings"
              accessibilityRole="link"
            >
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
            <View style={{ paddingHorizontal: 20, paddingVertical: 40 }}>
              <ActivityIndicator size="large" color={colors.foreground} />
            </View>
          ) : featuredListings?.length === 0 ? (
            <EmptyState
              icon="package"
              title="No listings yet"
              message="Be the first to list a card!"
              style={{ paddingVertical: 40 }}
            />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20 }}
            >
              {featuredListings?.map((listing) => (
                <FeaturedListingCard
                  key={listing.id}
                  listing={listing}
                  onPress={handleListingPress}
                />
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
              <TouchableOpacity
                onPress={handleSearchPress}
                accessibilityLabel="See all trending"
                accessibilityRole="link"
              >
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
                <GridListingCard
                  key={listing.id}
                  listing={listing}
                  onPress={handleListingPress}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
