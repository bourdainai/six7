import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";
import {
  Search,
  ArrowLeft,
  X,
  Check,
  ChevronRight,
  Sparkles,
} from "lucide-react-native";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useRouter } from "expo-router";
import { supabase, isSupabaseConfigured } from "@/utils/supabaseClient";
import { useAuth } from "@/utils/auth/useAuth";
import KeyboardAvoidingAnimatedView from "@/components/KeyboardAvoidingAnimatedView";

const colors = {
  background: "#FFFFFF",
  foreground: "#0A0A0A",
  gray: "#666666",
  lightGray: "#F8F8F8",
  border: "#E5E5E5",
  primary: "#0A0A0A",
  success: "#22C55E",
};

export default function AdvancedListing() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Selected card state
  const [selectedCard, setSelectedCard] = useState(null);

  // Listing form state
  const [step, setStep] = useState("search"); // search, form
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState("like_new");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        handleSearch(searchQuery.trim());
      } else {
        setSearchResults([]);
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearch = async (query) => {
    if (!isSupabaseConfigured()) {
      Alert.alert("Error", "Database not configured");
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    try {
      // Call the pokemon-search edge function
      const { data, error } = await supabase.functions.invoke("pokemon-search", {
        body: { query, limit: 30 },
      });

      if (error) {
        console.error("Search error:", error);
        // Fallback to direct database search
        const { data: dbData, error: dbError } = await supabase
          .from("pokemon_card_attributes")
          .select("*")
          .or(`name.ilike.%${query}%,name_en.ilike.%${query}%`)
          .limit(30);

        if (dbError) throw dbError;
        setSearchResults(dbData || []);
      } else {
        setSearchResults(data?.cards || []);
      }
    } catch (error) {
      console.error("Search error:", error);
      Alert.alert("Error", "Failed to search cards");
    } finally {
      setIsSearching(false);
    }
  };

  const handleCardSelect = (card) => {
    setSelectedCard(card);

    // Pre-fill form with card data
    const cardName = card.name_en || card.name || "Unknown Card";
    const setName = card.set_name || card.set_code || "";
    const cardNumber = card.number || "";

    setTitle(`${cardName} - ${setName} ${cardNumber}`.trim());
    setDescription(`${cardName}\nSet: ${setName}\nCard Number: ${cardNumber}`);

    // Move to form step
    setStep("form");
    Keyboard.dismiss();
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert("Sign In Required", "Please sign in to create a listing");
      return;
    }

    if (!title || !price || !condition) {
      Alert.alert("Missing Info", "Please fill in title, price, and condition");
      return;
    }

    setIsSubmitting(true);

    try {
      // Get the card image URL
      let imageUrl = null;
      if (selectedCard?.images) {
        imageUrl = selectedCard.images.large || selectedCard.images.small || selectedCard.images.tcgdex;
      }

      // Create the listing
      const { data: listing, error } = await supabase
        .from("listings")
        .insert({
          seller_id: user.id,
          title,
          description,
          category: "Trading Cards",
          subcategory: "Pokemon Singles",
          condition,
          seller_price: parseFloat(price),
          currency: "GBP",
          status: "published",
          accepts_offers: true,
          free_shipping: true,
          shipping_cost_uk: 0,
          set_code: selectedCard?.set_code || "",
          card_number: selectedCard?.number || "",
          rarity: selectedCard?.rarity || "",
        })
        .select()
        .single();

      if (error) throw error;

      // Create listing image if we have one
      if (imageUrl && listing) {
        await supabase.from("listing_images").insert({
          listing_id: listing.id,
          image_url: imageUrl,
          display_order: 0,
        });
      }

      Alert.alert("Success!", "Your listing is now live", [
        {
          text: "View Listing",
          onPress: () => router.push(`/listing/${listing.id}`),
        },
        {
          text: "List Another",
          onPress: () => {
            setStep("search");
            setSelectedCard(null);
            setSearchQuery("");
            setSearchResults([]);
            setTitle("");
            setPrice("");
            setDescription("");
            setCondition("like_new");
          },
        },
      ]);
    } catch (error) {
      console.error("Error creating listing:", error);
      Alert.alert("Error", error.message || "Failed to create listing");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  const CardResult = ({ card }) => {
    const imageUrl = card.images?.small || card.images?.large || card.images?.tcgdex;
    const displayName = card.name_en || card.name || "Unknown";
    const setInfo = card.set_name || card.set_code || "";

    return (
      <TouchableOpacity
        onPress={() => handleCardSelect(card)}
        style={{
          flexDirection: "row",
          padding: 12,
          backgroundColor: colors.background,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={{
              width: 60,
              height: 84,
              borderRadius: 6,
              backgroundColor: colors.lightGray,
            }}
            contentFit="contain"
          />
        ) : (
          <View
            style={{
              width: 60,
              height: 84,
              borderRadius: 6,
              backgroundColor: colors.lightGray,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 10, color: colors.gray }}>No Image</Text>
          </View>
        )}
        <View style={{ flex: 1, marginLeft: 12, justifyContent: "center" }}>
          <Text
            style={{
              fontFamily: "Inter_600SemiBold",
              fontSize: 14,
              color: colors.foreground,
              marginBottom: 4,
            }}
            numberOfLines={2}
          >
            {displayName}
          </Text>
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 12,
              color: colors.gray,
              marginBottom: 2,
            }}
          >
            {setInfo} {card.number && `#${card.number}`}
          </Text>
          {card.rarity && (
            <Text
              style={{
                fontFamily: "Inter_500Medium",
                fontSize: 11,
                color: colors.gray,
              }}
            >
              {card.rarity}
            </Text>
          )}
        </View>
        <ChevronRight size={20} color={colors.gray} style={{ alignSelf: "center" }} />
      </TouchableOpacity>
    );
  };

  const SearchScreen = () => (
    <View style={{ flex: 1 }}>
      {/* Search Input */}
      <View
        style={{
          paddingHorizontal: 24,
          paddingTop: 16,
          paddingBottom: 12,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.lightGray,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
          }}
        >
          <Search size={20} color={colors.gray} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search cards by name, set, or number..."
            placeholderTextColor={colors.gray}
            autoFocus
            style={{
              flex: 1,
              fontFamily: "Inter_400Regular",
              fontSize: 15,
              color: colors.foreground,
              marginLeft: 10,
            }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <X size={20} color={colors.gray} />
            </TouchableOpacity>
          )}
        </View>

        {/* Search hint */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginTop: 12,
            paddingHorizontal: 4,
          }}
        >
          <Sparkles size={14} color={colors.gray} />
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 12,
              color: colors.gray,
              marginLeft: 6,
            }}
          >
            Try "Charizard", "Base Set", or "25/102"
          </Text>
        </View>
      </View>

      {/* Results */}
      {isSearching ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.foreground} />
          <Text
            style={{
              fontFamily: "Inter_500Medium",
              fontSize: 14,
              color: colors.gray,
              marginTop: 12,
            }}
          >
            Searching cards...
          </Text>
        </View>
      ) : searchResults.length > 0 ? (
        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
          <Text
            style={{
              fontFamily: "Inter_600SemiBold",
              fontSize: 13,
              color: colors.gray,
              paddingHorizontal: 24,
              paddingVertical: 12,
            }}
          >
            {searchResults.length} cards found
          </Text>
          {searchResults.map((card, index) => (
            <CardResult key={card.id || index} card={card} />
          ))}
          <View style={{ height: 100 }} />
        </ScrollView>
      ) : hasSearched && searchQuery.length >= 2 ? (
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
            }}
          >
            No cards found
          </Text>
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 14,
              color: colors.gray,
              textAlign: "center",
            }}
          >
            Try a different search term
          </Text>
        </View>
      ) : (
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
            Search for a card to list
          </Text>
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 14,
              color: colors.gray,
              textAlign: "center",
            }}
          >
            Enter a card name, set name, or card number to find your card in our database
          </Text>
        </View>
      )}
    </View>
  );

  const FormScreen = () => (
    <KeyboardAvoidingAnimatedView style={{ flex: 1 }} behavior="padding">
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 16,
          paddingBottom: insets.bottom + 120,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Selected Card Preview */}
        {selectedCard && (
          <View
            style={{
              flexDirection: "row",
              backgroundColor: colors.lightGray,
              borderRadius: 12,
              padding: 16,
              marginBottom: 24,
            }}
          >
            {(selectedCard.images?.small || selectedCard.images?.large) && (
              <Image
                source={{ uri: selectedCard.images.small || selectedCard.images.large }}
                style={{
                  width: 70,
                  height: 98,
                  borderRadius: 6,
                }}
                contentFit="contain"
              />
            )}
            <View style={{ flex: 1, marginLeft: 14, justifyContent: "center" }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                <Check size={16} color={colors.success} />
                <Text
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 12,
                    color: colors.success,
                    marginLeft: 4,
                  }}
                >
                  Card Selected
                </Text>
              </View>
              <Text
                style={{
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 14,
                  color: colors.foreground,
                }}
                numberOfLines={2}
              >
                {selectedCard.name_en || selectedCard.name}
              </Text>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 12,
                  color: colors.gray,
                  marginTop: 2,
                }}
              >
                {selectedCard.set_name || selectedCard.set_code}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setStep("search");
                  setSelectedCard(null);
                }}
                style={{ marginTop: 8 }}
              >
                <Text
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 12,
                    color: colors.foreground,
                    textDecorationLine: "underline",
                  }}
                >
                  Change Card
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Title */}
        <Text style={styles.label}>Title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Card title"
          placeholderTextColor={colors.gray}
          style={styles.input}
        />

        {/* Price */}
        <Text style={styles.label}>Price (GBP)</Text>
        <TextInput
          value={price}
          onChangeText={setPrice}
          placeholder="0.00"
          keyboardType="decimal-pad"
          placeholderTextColor={colors.gray}
          style={styles.input}
        />

        {/* Condition */}
        <Text style={styles.label}>Condition</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
          {[
            { label: "Mint", value: "new_with_tags" },
            { label: "Near Mint", value: "like_new" },
            { label: "Excellent", value: "excellent" },
            { label: "Good", value: "good" },
            { label: "Fair", value: "fair" },
          ].map((cond) => (
            <TouchableOpacity
              key={cond.value}
              onPress={() => setCondition(cond.value)}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 16,
                backgroundColor: condition === cond.value ? colors.foreground : colors.lightGray,
                borderRadius: 20,
              }}
            >
              <Text
                style={{
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 13,
                  color: condition === cond.value ? colors.background : colors.foreground,
                }}
              >
                {cond.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Description */}
        <Text style={styles.label}>Description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Add details about your card..."
          placeholderTextColor={colors.gray}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          style={[styles.input, { minHeight: 100 }]}
        />
      </ScrollView>

      {/* Submit Button */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: colors.background,
          paddingHorizontal: 24,
          paddingTop: 16,
          paddingBottom: insets.bottom + 16,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isSubmitting}
          style={{
            backgroundColor: colors.foreground,
            paddingVertical: 16,
            borderRadius: 8,
            alignItems: "center",
            opacity: isSubmitting ? 0.7 : 1,
          }}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 15,
                color: colors.background,
              }}
            >
              Publish Listing
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingAnimatedView>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="dark" />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 16,
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
          onPress={() => {
            if (step === "form" && selectedCard) {
              setStep("search");
            } else {
              router.back();
            }
          }}
          style={{ marginRight: 16 }}
        >
          <ArrowLeft size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            fontSize: 24,
            color: colors.foreground,
            letterSpacing: -0.5,
          }}
        >
          Advanced Listing
        </Text>
      </View>

      {step === "search" && <SearchScreen />}
      {step === "form" && <FormScreen />}
    </View>
  );
}

const styles = {
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#0A0A0A",
    marginBottom: 8,
  },
  input: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: "#0A0A0A",
    backgroundColor: "#F8F8F8",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
};
