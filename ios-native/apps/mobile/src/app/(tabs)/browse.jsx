import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";
import { Search, ChevronDown, X } from "lucide-react-native";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useRouter } from "expo-router";
import { fetchListings, searchListings } from "@/utils/supabase";

const { width: screenWidth } = Dimensions.get("window");

const colors = {
  background: "#FFFFFF",
  foreground: "#0A0A0A",
  gray: "#666666",
  lightGray: "#F8F8F8",
  border: "#E5E5E5",
};

export default function Browse() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [sortBy, setSortBy] = useState("relevance");

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    loadListings();
  }, [selectedFilter, sortBy, searchQuery]);

  const loadListings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let data;
      if (searchQuery && searchQuery.trim().length > 0) {
        // Use search function
        console.log("Searching listings for:", searchQuery);
        data = await searchListings(searchQuery.trim());
      } else {
        // Use regular fetch with filters
        console.log("Fetching listings...");
        const filters = {};
        if (selectedFilter !== "all") {
          filters.category = selectedFilter;
        }
        
        data = await fetchListings({
          limit: 50,
          filters,
          orderBy: sortBy === "newest" ? "created_at" : sortBy === "popular" ? "views" : "created_at",
          ascending: false,
        });
      }
      
      console.log("Loaded listings:", data.length, "listings");
      setListings(data);
    } catch (error) {
      console.error("Error loading listings:", error);
      setError(error.message || "Failed to load listings");
    } finally {
      setLoading(false);
    }
  };


  if (!fontsLoaded) {
    return null;
  }

  const ListingCard = ({ listing }) => {
    const imageUrl =
      listing.listing_images?.[0]?.image_url ||
      "https://images.pokemontcg.io/swsh4/20_hires.png";

    const isBundle = listing.is_bundle || listing.listing_images?.length > 1;

    // Get seller name - use full_name from profiles table
    const sellerName = listing.seller?.full_name || "Anonymous";

    // Use seller_price from schema (correct column name)
    const displayPrice = listing.seller_price || listing.price || 0;

    const handlePress = () => {
      console.log("===== LISTING CARD CLICKED =====");
      console.log("Listing ID:", listing.id);
      console.log("Listing Title:", listing.title);
      console.log("Full Listing Object:", JSON.stringify(listing, null, 2));
      console.log("Routing to:", `/listing/${listing.id}`);
      console.log("================================");
      router.push(`/listing/${listing.id}`);
    };

    return (
      <TouchableOpacity
        onPress={handlePress}
        style={{
          width: (screenWidth - 72) / 2,
          backgroundColor: colors.lightGray,
          borderRadius: 12,
          overflow: "hidden",
          marginBottom: 16,
        }}
      >
        {/* Multi-Card Badge */}
        {isBundle && (
          <View
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              backgroundColor: colors.foreground,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 4,
              zIndex: 1,
            }}
          >
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 10,
                color: colors.background,
              }}
            >
              Multi-Card
            </Text>
          </View>
        )}

        <View style={{ padding: 16, aspectRatio: 0.7 }}>
          <Image
            source={{ uri: imageUrl }}
            style={{
              width: "100%",
              height: "100%",
            }}
            contentFit="contain"
          />
        </View>
        <View
          style={{
            padding: 16,
            backgroundColor: colors.background,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          <Text
            style={{
              fontFamily: "Inter_600SemiBold",
              fontSize: 13,
              color: colors.foreground,
              marginBottom: 4,
            }}
            numberOfLines={2}
          >
            {listing.title}
          </Text>

          {/* Category & Condition */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <Text
              style={{
                fontFamily: "Inter_500Medium",
                fontSize: 11,
                color: colors.gray,
              }}
            >
              Pokémon
            </Text>
            {listing.condition && (
              <>
                <View
                  style={{
                    width: 3,
                    height: 3,
                    borderRadius: 1.5,
                    backgroundColor: colors.gray,
                    marginHorizontal: 6,
                  }}
                />
                <Text
                  style={{
                    fontFamily: "Inter_500Medium",
                    fontSize: 11,
                    color: colors.gray,
                  }}
                >
                  {listing.condition}
                </Text>
              </>
            )}
          </View>

          <Text
            style={{
              fontFamily: "Inter_700Bold",
              fontSize: 18,
              color: colors.foreground,
              letterSpacing: -0.5,
            }}
          >
            {isBundle && "From "}£{displayPrice}
          </Text>
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
          Browse
        </Text>

        {/* Search Bar with elevated web-style shadow */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 16,
            paddingHorizontal: 16,
            paddingVertical: 14,
            marginBottom: 16,
            flexDirection: "row",
            alignItems: "center",
            shadowColor: "#000000",
            shadowOffset: {
              width: 0,
              height: 4,
            },
            shadowOpacity: 0.08,
            shadowRadius: 16,
            elevation: 8,
          }}
        >
          <Search size={20} color={colors.gray} strokeWidth={2} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search for cards, sets, or other..."
            placeholderTextColor={colors.gray}
            style={{
              flex: 1,
              fontFamily: "Inter_400Regular",
              fontSize: 15,
              color: colors.foreground,
              marginLeft: 12,
            }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <X size={20} color={colors.gray} strokeWidth={2} />
            </TouchableOpacity>
          )}
        </View>

        {/* Sort & Results */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <Text
            style={{
              fontFamily: "Inter_500Medium",
              fontSize: 13,
              color: colors.gray,
            }}
          >
            {listings.length} results found
          </Text>
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: colors.lightGray,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
            }}
          >
            <Text
              style={{
                fontFamily: "Inter_500Medium",
                fontSize: 13,
                color: colors.foreground,
                marginRight: 4,
              }}
            >
              Sort by:{" "}
              {sortBy === "relevance"
                ? "Relevance"
                : sortBy === "newest"
                  ? "Newest"
                  : "Popular"}
            </Text>
            <ChevronDown size={16} color={colors.foreground} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {["All", "Pokémon", "Sports", "Graded"].map((filter) => (
            <TouchableOpacity
              key={filter}
              onPress={() => setSelectedFilter(filter.toLowerCase())}
              style={{
                backgroundColor:
                  selectedFilter === filter.toLowerCase()
                    ? colors.foreground
                    : colors.lightGray,
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 20,
              }}
            >
              <Text
                style={{
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 13,
                  color:
                    selectedFilter === filter.toLowerCase()
                      ? colors.background
                      : colors.foreground,
                }}
              >
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Listings Grid */}
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
            Loading products...
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
            Couldn't load products
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
            onPress={loadListings}
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
      ) : listings.length === 0 ? (
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
            No products yet
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
            Be the first to list an item
          </Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 20,
            paddingBottom: insets.bottom + 100,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
