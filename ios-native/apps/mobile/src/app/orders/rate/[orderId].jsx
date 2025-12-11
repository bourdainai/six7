import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  ChevronLeft,
  Star,
  Camera,
  X,
  Check,
} from "lucide-react-native";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import * as ImagePicker from "expo-image-picker";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/utils/auth/useAuth";

const colors = {
  background: "#FFFFFF",
  foreground: "#0A0A0A",
  gray: "#666666",
  lightGray: "#F8F8F8",
  border: "#E5E5E5",
  primary: "#0A0A0A",
  warning: "#F59E0B",
  success: "#22C55E",
};

export default function RateOrderScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { orderId } = useLocalSearchParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Fetch order details
  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ["order-for-rating", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          listing:listings(id, title, card_name),
          seller:profiles!orders_seller_id_fkey(id, full_name, username)
        `)
        .eq("id", orderId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });

  // Check if already rated
  const { data: existingRating } = useQuery({
    queryKey: ["existing-rating", orderId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ratings")
        .select("id")
        .eq("order_id", orderId)
        .eq("reviewer_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!orderId && !!user?.id,
  });

  // Submit rating mutation
  const submitRating = useMutation({
    mutationFn: async () => {
      if (!rating || rating < 1) {
        throw new Error("Please select a rating");
      }

      // Upload images if any
      let reviewImages = [];
      if (images.length > 0) {
        setUploading(true);
        for (const img of images) {
          const fileName = `review-${orderId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("listing-images")
            .upload(fileName, {
              uri: img.uri,
              type: "image/jpeg",
              name: fileName,
            });

          if (uploadError) {
            console.error("Upload error:", uploadError);
            continue;
          }

          const { data: { publicUrl } } = supabase.storage
            .from("listing-images")
            .getPublicUrl(fileName);

          reviewImages.push(publicUrl);
        }
        setUploading(false);
      }

      // Determine if verified purchase
      const isVerified = order?.status === "delivered" || order?.status === "completed";

      const { data, error } = await supabase
        .from("ratings")
        .insert({
          order_id: orderId,
          listing_id: order.listing_id,
          reviewer_id: user.id,
          reviewee_id: order.seller_id,
          rating: rating,
          review_text: reviewText.trim() || null,
          review_images: reviewImages.length > 0 ? reviewImages : null,
          review_type: "buyer_to_seller",
          verified_purchase: isVerified,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["orders"]);
      queryClient.invalidateQueries(["order-for-rating", orderId]);
      Alert.alert(
        "Review Submitted",
        "Thank you for your feedback!",
        [{ text: "OK", onPress: () => router.back() }]
      );
    },
    onError: (error) => {
      Alert.alert("Error", error.message || "Failed to submit review");
    },
  });

  const pickImage = async () => {
    if (images.length >= 3) {
      Alert.alert("Limit Reached", "You can only add up to 3 photos");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImages([...images, result.assets[0]]);
    }
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  if (!fontsLoaded || orderLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.foreground} />
      </View>
    );
  }

  if (existingRating) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style="dark" />
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
            }}
          >
            <ChevronLeft size={24} color={colors.foreground} strokeWidth={2} />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 40 }}>
          <Check size={64} color={colors.success} strokeWidth={1.5} />
          <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 18, color: colors.foreground, marginTop: 16, textAlign: "center" }}>
            Already Reviewed
          </Text>
          <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: colors.gray, marginTop: 8, textAlign: "center" }}>
            You've already submitted a review for this order
          </Text>
        </View>
      </View>
    );
  }

  const sellerName = order?.seller?.full_name || order?.seller?.username || "Seller";

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
              fontSize: 20,
              color: colors.foreground,
              letterSpacing: -0.5,
            }}
          >
            Rate {sellerName}
          </Text>
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 13,
              color: colors.gray,
              marginTop: 2,
            }}
          >
            {order?.listing?.card_name || order?.listing?.title}
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 24,
          paddingBottom: insets.bottom + 100,
        }}
      >
        {/* Star Rating */}
        <View style={{ alignItems: "center", marginBottom: 32 }}>
          <Text
            style={{
              fontFamily: "Inter_600SemiBold",
              fontSize: 16,
              color: colors.foreground,
              marginBottom: 16,
            }}
          >
            How was your experience?
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
                onPressIn={() => setHoverRating(star)}
                onPressOut={() => setHoverRating(0)}
              >
                <Star
                  size={40}
                  color={colors.warning}
                  strokeWidth={2}
                  fill={(hoverRating || rating) >= star ? colors.warning : "transparent"}
                />
              </TouchableOpacity>
            ))}
          </View>
          <Text
            style={{
              fontFamily: "Inter_500Medium",
              fontSize: 14,
              color: colors.gray,
              marginTop: 8,
            }}
          >
            {rating === 0
              ? "Tap to rate"
              : rating === 1
              ? "Poor"
              : rating === 2
              ? "Fair"
              : rating === 3
              ? "Good"
              : rating === 4
              ? "Very Good"
              : "Excellent"}
          </Text>
        </View>

        {/* Review Text */}
        <View style={{ marginBottom: 24 }}>
          <Text
            style={{
              fontFamily: "Inter_600SemiBold",
              fontSize: 14,
              color: colors.foreground,
              marginBottom: 8,
            }}
          >
            Write a review (optional)
          </Text>
          <TextInput
            value={reviewText}
            onChangeText={setReviewText}
            placeholder="Share your experience with this seller..."
            placeholderTextColor={colors.gray}
            multiline
            numberOfLines={4}
            style={{
              backgroundColor: colors.lightGray,
              borderRadius: 12,
              padding: 16,
              fontFamily: "Inter_400Regular",
              fontSize: 14,
              color: colors.foreground,
              minHeight: 120,
              textAlignVertical: "top",
            }}
          />
        </View>

        {/* Photo Upload */}
        <View style={{ marginBottom: 32 }}>
          <Text
            style={{
              fontFamily: "Inter_600SemiBold",
              fontSize: 14,
              color: colors.foreground,
              marginBottom: 8,
            }}
          >
            Add photos (optional)
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {images.map((img, index) => (
              <View key={index} style={{ position: "relative" }}>
                <Image
                  source={{ uri: img.uri }}
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 8,
                  }}
                />
                <TouchableOpacity
                  onPress={() => removeImage(index)}
                  style={{
                    position: "absolute",
                    top: -8,
                    right: -8,
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: colors.foreground,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <X size={14} color={colors.background} strokeWidth={2} />
                </TouchableOpacity>
              </View>
            ))}
            {images.length < 3 && (
              <TouchableOpacity
                onPress={pickImage}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 8,
                  borderWidth: 2,
                  borderStyle: "dashed",
                  borderColor: colors.border,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Camera size={24} color={colors.gray} strokeWidth={2} />
              </TouchableOpacity>
            )}
          </View>
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 12,
              color: colors.gray,
              marginTop: 8,
            }}
          >
            Up to 3 photos
          </Text>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 24,
          paddingTop: 16,
          paddingBottom: insets.bottom + 16,
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <TouchableOpacity
          onPress={() => submitRating.mutate()}
          disabled={rating === 0 || submitRating.isPending || uploading}
          style={{
            backgroundColor: rating === 0 ? colors.gray : colors.foreground,
            borderRadius: 12,
            padding: 18,
            alignItems: "center",
            opacity: rating === 0 || submitRating.isPending || uploading ? 0.5 : 1,
          }}
        >
          {submitRating.isPending || uploading ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 16,
                color: colors.background,
              }}
            >
              Submit Review
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
