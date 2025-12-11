import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  ArrowLeftRight,
  Package,
  Plus,
  X,
  Camera,
  DollarSign,
} from "lucide-react-native";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/utils/auth/useAuth";

const colors = {
  background: "#FFFFFF",
  foreground: "#0A0A0A",
  gray: "#666666",
  lightGray: "#F8F8F8",
  border: "#E5E5E5",
  green: "#10B981",
  red: "#EF4444",
};

export default function CreateTradeOfferScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { listingId } = useLocalSearchParams();
  const { user } = useAuth();

  const [tradeItems, setTradeItems] = useState([]);
  const [cashAmount, setCashAmount] = useState("");
  const [message, setMessage] = useState("");
  const [showMyListings, setShowMyListings] = useState(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Fetch target listing
  const { data: targetListing, isLoading: loadingTarget } = useQuery({
    queryKey: ["listing", listingId],
    queryFn: async () => {
      if (!listingId) return null;

      const { data, error } = await supabase
        .from("listings")
        .select(`
          *,
          seller:profiles!seller_id(id, full_name, avatar_url),
          listing_images(image_url, display_order)
        `)
        .eq("id", listingId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!listingId,
  });

  // Fetch user's listings for trade
  const { data: myListings, isLoading: loadingMyListings } = useQuery({
    queryKey: ["my-listings", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("listings")
        .select(`
          id,
          title,
          seller_price,
          condition,
          listing_images(image_url, display_order)
        `)
        .eq("seller_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && showMyListings,
  });

  const createOfferMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !listingId || !targetListing) {
        throw new Error("Missing required data");
      }

      const { data, error } = await supabase.functions.invoke("trade-create", {
        body: {
          target_listing_id: listingId,
          seller_id: targetListing.seller_id,
          trade_items: tradeItems.map((item) => ({
            listing_id: item.id,
            title: item.title,
          })),
          cash_amount: parseFloat(cashAmount) || 0,
          message: message.trim() || null,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      Alert.alert(
        "Offer Sent!",
        "Your trade offer has been sent to the seller.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    },
    onError: (error) => {
      Alert.alert("Error", error.message || "Failed to create trade offer");
    },
  });

  const addItem = (listing) => {
    if (tradeItems.find((item) => item.id === listing.id)) {
      Alert.alert("Already Added", "This item is already in your offer");
      return;
    }
    setTradeItems([...tradeItems, listing]);
    setShowMyListings(false);
  };

  const removeItem = (listingId) => {
    setTradeItems(tradeItems.filter((item) => item.id !== listingId));
  };

  const handleSubmit = () => {
    if (tradeItems.length === 0 && !cashAmount) {
      Alert.alert("Empty Offer", "Please add at least one item or cash to your offer");
      return;
    }

    Alert.alert(
      "Send Trade Offer",
      "Are you sure you want to send this trade offer?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Send", onPress: () => createOfferMutation.mutate() },
      ]
    );
  };

  if (!fontsLoaded) {
    return null;
  }

  if (loadingTarget) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={colors.foreground} />
      </View>
    );
  }

  if (!targetListing) {
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
            Listing Not Found
          </Text>
        </View>
      </View>
    );
  }

  const targetImageUrl = targetListing.listing_images?.sort((a, b) => a.display_order - b.display_order)?.[0]?.image_url;
  const totalOfferedValue = tradeItems.reduce((sum, item) => sum + (item.seller_price || 0), 0) + (parseFloat(cashAmount) || 0);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <StatusBar style="dark" />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 20,
          paddingBottom: 12,
          flexDirection: "row",
          alignItems: "center",
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
          <ArrowLeft size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <ArrowLeftRight size={20} color={colors.foreground} />
          <Text style={{ fontFamily: "Inter_700Bold", fontSize: 18, color: colors.foreground }}>
            Create Trade Offer
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Target Listing */}
        <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 16, color: colors.foreground, marginBottom: 12 }}>
          You Want
        </Text>
        <View
          style={{
            backgroundColor: colors.lightGray,
            borderRadius: 12,
            padding: 12,
            flexDirection: "row",
            marginBottom: 24,
          }}
        >
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 8,
              backgroundColor: colors.border,
              overflow: "hidden",
              marginRight: 12,
            }}
          >
            {targetImageUrl ? (
              <Image source={{ uri: targetImageUrl }} style={{ width: 80, height: 80 }} resizeMode="cover" />
            ) : (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <Package size={28} color={colors.gray} />
              </View>
            )}
          </View>
          <View style={{ flex: 1, justifyContent: "center" }}>
            <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 15, color: colors.foreground }} numberOfLines={2}>
              {targetListing.title}
            </Text>
            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: colors.gray, marginTop: 4 }}>
              by {targetListing.seller?.full_name || "Seller"}
            </Text>
            <Text style={{ fontFamily: "Inter_700Bold", fontSize: 16, color: colors.foreground, marginTop: 6 }}>
              £{Number(targetListing.seller_price || 0).toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Your Offer */}
        <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 16, color: colors.foreground, marginBottom: 12 }}>
          Your Offer
        </Text>

        {/* Trade Items */}
        {tradeItems.map((item) => {
          const imageUrl = item.listing_images?.sort((a, b) => a.display_order - b.display_order)?.[0]?.image_url;
          return (
            <View
              key={item.id}
              style={{
                backgroundColor: colors.lightGray,
                borderRadius: 12,
                padding: 12,
                flexDirection: "row",
                marginBottom: 10,
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 8,
                  backgroundColor: colors.border,
                  overflow: "hidden",
                  marginRight: 12,
                }}
              >
                {imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={{ width: 60, height: 60 }} resizeMode="cover" />
                ) : (
                  <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <Package size={20} color={colors.gray} />
                  </View>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: colors.foreground }} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.foreground, marginTop: 2 }}>
                  £{Number(item.seller_price || 0).toFixed(2)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => removeItem(item.id)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: colors.red + "20",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={16} color={colors.red} />
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Add Item Button */}
        <TouchableOpacity
          onPress={() => setShowMyListings(true)}
          style={{
            borderWidth: 2,
            borderStyle: "dashed",
            borderColor: colors.border,
            borderRadius: 12,
            padding: 20,
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <Plus size={24} color={colors.gray} />
          <Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: colors.gray, marginTop: 8 }}>
            Add Item from Your Listings
          </Text>
        </TouchableOpacity>

        {/* Cash Amount */}
        <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.foreground, marginBottom: 8 }}>
          Add Cash (optional)
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.lightGray,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.border,
            marginBottom: 20,
          }}
        >
          <Text style={{ fontFamily: "Inter_500Medium", fontSize: 18, color: colors.foreground, paddingLeft: 16 }}>
            £
          </Text>
          <TextInput
            value={cashAmount}
            onChangeText={setCashAmount}
            placeholder="0.00"
            placeholderTextColor={colors.gray}
            keyboardType="decimal-pad"
            style={{
              flex: 1,
              fontFamily: "Inter_500Medium",
              fontSize: 18,
              color: colors.foreground,
              paddingVertical: 14,
              paddingHorizontal: 12,
            }}
          />
        </View>

        {/* Message */}
        <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.foreground, marginBottom: 8 }}>
          Message (optional)
        </Text>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Add a message to the seller..."
          placeholderTextColor={colors.gray}
          multiline
          numberOfLines={3}
          style={{
            backgroundColor: colors.lightGray,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 14,
            fontFamily: "Inter_400Regular",
            fontSize: 14,
            color: colors.foreground,
            minHeight: 80,
            textAlignVertical: "top",
            marginBottom: 20,
          }}
        />

        {/* Total */}
        <View
          style={{
            backgroundColor: colors.lightGray,
            borderRadius: 12,
            padding: 16,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: colors.gray }}>
              Your Offer Total
            </Text>
            <Text style={{ fontFamily: "Inter_700Bold", fontSize: 20, color: colors.foreground }}>
              £{totalOfferedValue.toFixed(2)}
            </Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: colors.gray }}>
              Their Asking Price
            </Text>
            <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 16, color: colors.gray }}>
              £{Number(targetListing.seller_price || 0).toFixed(2)}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* My Listings Picker */}
      {showMyListings && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              maxHeight: "70%",
              paddingTop: 20,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingHorizontal: 20,
                marginBottom: 16,
              }}
            >
              <Text style={{ fontFamily: "Inter_700Bold", fontSize: 18, color: colors.foreground }}>
                Select Item
              </Text>
              <TouchableOpacity onPress={() => setShowMyListings(false)}>
                <X size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            {loadingMyListings ? (
              <View style={{ padding: 40, alignItems: "center" }}>
                <ActivityIndicator size="large" color={colors.foreground} />
              </View>
            ) : myListings?.length === 0 ? (
              <View style={{ padding: 40, alignItems: "center" }}>
                <Package size={48} color={colors.gray} />
                <Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: colors.gray, marginTop: 12 }}>
                  You don't have any active listings
                </Text>
              </View>
            ) : (
              <ScrollView
                style={{ maxHeight: 400 }}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 20 }}
              >
                {myListings?.map((listing) => {
                  const imageUrl = listing.listing_images?.sort((a, b) => a.display_order - b.display_order)?.[0]?.image_url;
                  const isSelected = tradeItems.find((item) => item.id === listing.id);
                  return (
                    <TouchableOpacity
                      key={listing.id}
                      onPress={() => addItem(listing)}
                      disabled={isSelected}
                      style={{
                        flexDirection: "row",
                        backgroundColor: isSelected ? colors.green + "10" : colors.lightGray,
                        borderRadius: 12,
                        padding: 12,
                        marginBottom: 10,
                        opacity: isSelected ? 0.6 : 1,
                      }}
                    >
                      <View
                        style={{
                          width: 60,
                          height: 60,
                          borderRadius: 8,
                          backgroundColor: colors.border,
                          overflow: "hidden",
                          marginRight: 12,
                        }}
                      >
                        {imageUrl ? (
                          <Image source={{ uri: imageUrl }} style={{ width: 60, height: 60 }} resizeMode="cover" />
                        ) : (
                          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                            <Package size={20} color={colors.gray} />
                          </View>
                        )}
                      </View>
                      <View style={{ flex: 1, justifyContent: "center" }}>
                        <Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: colors.foreground }} numberOfLines={2}>
                          {listing.title}
                        </Text>
                        <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.foreground, marginTop: 4 }}>
                          £{Number(listing.seller_price || 0).toFixed(2)}
                        </Text>
                      </View>
                      {isSelected && (
                        <View style={{ alignSelf: "center" }}>
                          <Text style={{ fontFamily: "Inter_500Medium", fontSize: 12, color: colors.green }}>Added</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      )}

      {/* Submit Button */}
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
        }}
      >
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={createOfferMutation.isPending || (tradeItems.length === 0 && !cashAmount)}
          style={{
            backgroundColor: colors.foreground,
            borderRadius: 8,
            paddingVertical: 16,
            alignItems: "center",
            opacity: createOfferMutation.isPending || (tradeItems.length === 0 && !cashAmount) ? 0.6 : 1,
          }}
        >
          {createOfferMutation.isPending ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 16, color: colors.background }}>
              Send Trade Offer
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
