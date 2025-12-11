import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";
import { Search, ChevronDown, X, Sparkles, Camera, Package } from "lucide-react-native";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { fetchListings, searchListings, supabase, isSupabaseConfigured } from "@/utils/supabaseClient";

// AI Vibe Search function
async function vibeSearch(query) {
  if (!isSupabaseConfigured() || !query) {
    return [];
  }

  try {
    // Call the vibe-search edge function
    const { data, error } = await supabase.functions.invoke("vibe-search", {
      body: { query, limit: 30 },
    });

    if (error) {
      console.error("Vibe search error:", error);
      // Fallback to regular search
      return await searchListings(query);
    }

    return data?.listings || [];
  } catch (error) {
    console.error("Vibe search error:", error);
    return await searchListings(query);
  }
}

// AI Image Search function
async function imageSearch(base64Image) {
  if (!isSupabaseConfigured() || !base64Image) {
    return [];
  }

  try {
    // Call the image-search edge function
    const { data, error } = await supabase.functions.invoke("ai-image-search", {
      body: { image: base64Image, limit: 20 },
    });

    if (error) {
      console.error("Image search error:", error);
      return [];
    }

    return data?.listings || [];
  } catch (error) {
    console.error("Image search error:", error);
    return [];
  }
}

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
  const [searchMode, setSearchMode] = useState("normal"); // normal, vibe, image
  const [showImageSearch, setShowImageSearch] = useState(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    loadListings();
  }, [selectedFilter, sortBy, searchQuery, searchMode]);

  const loadListings = async () => {
    try {
      setLoading(true);
      setError(null);

      let data;
      if (searchQuery && searchQuery.trim().length > 0) {
        if (searchMode === "vibe") {
          // Use AI Vibe Search
          console.log("Vibe searching for:", searchQuery);
          data = await vibeSearch(searchQuery.trim());
        } else {
          // Use regular search
          console.log("Searching listings for:", searchQuery);
          data = await searchListings(searchQuery.trim());
        }
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

  // Handle image search
  const handleImageSearch = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]?.base64) {
        setLoading(true);
        setSearchMode("image");
        const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
        const data = await imageSearch(base64);
        setListings(data);
        setLoading(false);
      }
    } catch (error) {
      console.error("Image picker error:", error);
      setError("Failed to process image");
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

        {/* Search Mode Toggle */}
        <View
          style={{
            flexDirection: "row",
            marginBottom: 12,
            gap: 8,
          }}
        >
          <TouchableOpacity
            onPress={() => setSearchMode("normal")}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: searchMode === "normal" ? colors.foreground : colors.lightGray,
              paddingVertical: 10,
              borderRadius: 10,
              gap: 6,
            }}
          >
            <Search
              size={16}
              color={searchMode === "normal" ? colors.background : colors.foreground}
              strokeWidth={2}
            />
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 13,
                color: searchMode === "normal" ? colors.background : colors.foreground,
              }}
            >
              Search
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSearchMode("vibe")}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: searchMode === "vibe" ? colors.foreground : colors.lightGray,
              paddingVertical: 10,
              borderRadius: 10,
              gap: 6,
            }}
          >
            <Sparkles
              size={16}
              color={searchMode === "vibe" ? colors.background : colors.foreground}
              strokeWidth={2}
            />
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 13,
                color: searchMode === "vibe" ? colors.background : colors.foreground,
              }}
            >
              Vibe
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleImageSearch}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: searchMode === "image" ? colors.foreground : colors.lightGray,
              paddingVertical: 10,
              borderRadius: 10,
              gap: 6,
            }}
          >
            <Camera
              size={16}
              color={searchMode === "image" ? colors.background : colors.foreground}
              strokeWidth={2}
            />
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 13,
                color: searchMode === "image" ? colors.background : colors.foreground,
              }}
            >
              Image
            </Text>
          </TouchableOpacity>
        </View>

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
          {searchMode === "vibe" ? (
            <Sparkles size={20} color={colors.foreground} strokeWidth={2} />
          ) : (
            <Search size={20} color={colors.gray} strokeWidth={2} />
          )}
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={
              searchMode === "vibe"
                ? "Describe what you're looking for..."
                : "Search for cards, sets, or other..."
            }
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

        {/* Vibe Search Hint */}
        {searchMode === "vibe" && (
          <View
            style={{
              backgroundColor: "#F0F9FF",
              borderRadius: 10,
              padding: 12,
              marginBottom: 12,
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            <Sparkles size={16} color="#0284C7" strokeWidth={2} />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: "Inter_500Medium",
                  fontSize: 12,
                  color: "#0284C7",
                }}
              >
                AI-Powered Vibe Search
              </Text>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 11,
                  color: "#0369A1",
                  marginTop: 2,
                }}
              >
                Try "rare vintage Charizard cards" or "holographic first edition"
              </Text>
            </View>
          </View>
        )}

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
          {/* Bundles Quick Link */}
          <TouchableOpacity
            onPress={() => router.push("/bundles")}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#F0FDF4",
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: "#22C55E",
              gap: 6,
            }}
          >
            <Package size={14} color="#22C55E" strokeWidth={2} />
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 13,
                color: "#22C55E",
              }}
            >
              Bundles
            </Text>
          </TouchableOpacity>

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
