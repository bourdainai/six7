import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";
import { ArrowLeft, Save, X, Plus, Trash2 } from "lucide-react-native";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/utils/auth/useAuth";
import * as ImagePicker from "expo-image-picker";
import KeyboardAvoidingAnimatedView from "@/components/KeyboardAvoidingAnimatedView";

const colors = {
  background: "#FFFFFF",
  foreground: "#0A0A0A",
  gray: "#666666",
  lightGray: "#F8F8F8",
  border: "#E5E5E5",
  red: "#EF4444",
  green: "#10B981",
};

export default function EditListing() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id: listingId } = useLocalSearchParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState("like_new");
  const [acceptsOffers, setAcceptsOffers] = useState(true);
  const [freeShipping, setFreeShipping] = useState(true);
  const [shippingCost, setShippingCost] = useState("");
  const [images, setImages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Fetch listing data
  const { data: listing, isLoading } = useQuery({
    queryKey: ["listing-edit", listingId],
    queryFn: async () => {
      if (!listingId) return null;

      const { data, error } = await supabase
        .from("listings")
        .select(`
          *,
          listing_images(id, image_url, display_order)
        `)
        .eq("id", listingId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!listingId,
  });

  // Initialize form with listing data
  useEffect(() => {
    if (listing) {
      setTitle(listing.title || "");
      setDescription(listing.description || "");
      setPrice(String(listing.seller_price || ""));
      setCondition(listing.condition || "like_new");
      setAcceptsOffers(listing.accepts_offers ?? true);
      setFreeShipping(listing.free_shipping ?? true);
      setShippingCost(String(listing.shipping_cost_uk || ""));
      setImages(listing.listing_images || []);
    }
  }, [listing]);

  // Check ownership
  useEffect(() => {
    if (listing && user && listing.seller_id !== user.id) {
      Alert.alert("Access Denied", "You can only edit your own listings");
      router.back();
    }
  }, [listing, user]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow access to your photos");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      setNewImages((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
    }
  };

  const removeExistingImage = async (imageId) => {
    Alert.alert(
      "Remove Image",
      "Are you sure you want to remove this image?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("listing_images")
                .delete()
                .eq("id", imageId);

              if (error) throw error;
              setImages((prev) => prev.filter((img) => img.id !== imageId));
            } catch (error) {
              console.error("Error removing image:", error);
              Alert.alert("Error", "Failed to remove image");
            }
          },
        },
      ]
    );
  };

  const removeNewImage = (index) => {
    setNewImages((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadNewImages = async () => {
    const uploadedUrls = [];

    for (const uri of newImages) {
      try {
        const fileName = `${listingId}/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

        // Get the file
        const response = await fetch(uri);
        const blob = await response.blob();

        const { data, error } = await supabase.storage
          .from("listing-images")
          .upload(fileName, blob, {
            contentType: "image/jpeg",
          });

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from("listing-images")
          .getPublicUrl(fileName);

        uploadedUrls.push(urlData.publicUrl);
      } catch (error) {
        console.error("Error uploading image:", error);
      }
    }

    return uploadedUrls;
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "Please enter a title");
      return;
    }
    if (!price || isNaN(parseFloat(price))) {
      Alert.alert("Error", "Please enter a valid price");
      return;
    }

    setIsSaving(true);

    try {
      // Update listing data
      const { error: updateError } = await supabase
        .from("listings")
        .update({
          title: title.trim(),
          description: description.trim(),
          seller_price: parseFloat(price),
          condition,
          accepts_offers: acceptsOffers,
          free_shipping: freeShipping,
          shipping_cost_uk: freeShipping ? 0 : parseFloat(shippingCost) || 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", listingId)
        .eq("seller_id", user.id);

      if (updateError) throw updateError;

      // Upload new images if any
      if (newImages.length > 0) {
        const uploadedUrls = await uploadNewImages();
        const currentMaxOrder = images.length > 0
          ? Math.max(...images.map((img) => img.display_order || 0))
          : -1;

        for (let i = 0; i < uploadedUrls.length; i++) {
          await supabase.from("listing_images").insert({
            listing_id: listingId,
            image_url: uploadedUrls[i],
            display_order: currentMaxOrder + i + 1,
          });
        }
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["listing", listingId] });
      queryClient.invalidateQueries({ queryKey: ["listing-edit", listingId] });

      Alert.alert("Success", "Listing updated successfully", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error("Error saving listing:", error);
      Alert.alert("Error", error.message || "Failed to save listing");
    } finally {
      setIsSaving(false);
    }
  };

  if (!fontsLoaded || isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={colors.foreground} />
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        <StatusBar style="dark" />
        <View style={{ padding: 20 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.foreground} />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 16, color: colors.foreground }}>
            Listing not found
          </Text>
        </View>
      </View>
    );
  }

  const formatCondition = (cond) => {
    const labels = {
      new_with_tags: "Mint",
      like_new: "Near Mint",
      excellent: "Excellent",
      good: "Good",
      fair: "Fair",
    };
    return labels[cond] || cond;
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="dark" />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: 16,
          backgroundColor: colors.background,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            fontSize: 18,
            color: colors.foreground,
          }}
        >
          Edit Listing
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving}
          style={{ opacity: isSaving ? 0.5 : 1 }}
        >
          <Save size={24} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingAnimatedView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: 20,
            paddingBottom: insets.bottom + 100,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Images */}
          <Text style={styles.sectionTitle}>Photos</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 24 }}
          >
            {images.map((image, index) => (
              <View
                key={image.id}
                style={{
                  width: 100,
                  height: 140,
                  marginRight: 12,
                  borderRadius: 8,
                  overflow: "hidden",
                  backgroundColor: colors.lightGray,
                }}
              >
                <Image
                  source={{ uri: image.image_url }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                />
                <TouchableOpacity
                  onPress={() => removeExistingImage(image.id)}
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    backgroundColor: "rgba(0,0,0,0.7)",
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <X size={14} color={colors.background} />
                </TouchableOpacity>
              </View>
            ))}
            {newImages.map((uri, index) => (
              <View
                key={`new-${index}`}
                style={{
                  width: 100,
                  height: 140,
                  marginRight: 12,
                  borderRadius: 8,
                  overflow: "hidden",
                  backgroundColor: colors.lightGray,
                }}
              >
                <Image
                  source={{ uri }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                />
                <TouchableOpacity
                  onPress={() => removeNewImage(index)}
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    backgroundColor: "rgba(0,0,0,0.7)",
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <X size={14} color={colors.background} />
                </TouchableOpacity>
                <View
                  style={{
                    position: "absolute",
                    bottom: 6,
                    left: 6,
                    backgroundColor: colors.green,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 4,
                  }}
                >
                  <Text style={{ fontSize: 10, color: colors.background, fontWeight: "600" }}>
                    New
                  </Text>
                </View>
              </View>
            ))}
            <TouchableOpacity
              onPress={pickImage}
              style={{
                width: 100,
                height: 140,
                borderRadius: 8,
                borderWidth: 1.5,
                borderStyle: "dashed",
                borderColor: colors.border,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.lightGray,
              }}
            >
              <Plus size={28} color={colors.gray} />
              <Text style={{ fontFamily: "Inter_500Medium", fontSize: 11, color: colors.gray, marginTop: 6 }}>
                Add Photo
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Title */}
          <Text style={styles.label}>Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Listing title"
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
            placeholder="Describe your item..."
            placeholderTextColor={colors.gray}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            style={[styles.input, { minHeight: 100 }]}
          />

          {/* Accepts Offers */}
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Accept Offers</Text>
            <Switch
              value={acceptsOffers}
              onValueChange={setAcceptsOffers}
              trackColor={{ false: colors.border, true: colors.foreground }}
              thumbColor={colors.background}
            />
          </View>

          {/* Free Shipping */}
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Free Shipping</Text>
            <Switch
              value={freeShipping}
              onValueChange={setFreeShipping}
              trackColor={{ false: colors.border, true: colors.foreground }}
              thumbColor={colors.background}
            />
          </View>

          {/* Shipping Cost (if not free) */}
          {!freeShipping && (
            <>
              <Text style={styles.label}>Shipping Cost (GBP)</Text>
              <TextInput
                value={shippingCost}
                onChangeText={setShippingCost}
                placeholder="0.00"
                keyboardType="decimal-pad"
                placeholderTextColor={colors.gray}
                style={styles.input}
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingAnimatedView>

      {/* Save Button */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: colors.background,
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: insets.bottom + 16,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving}
          style={{
            backgroundColor: colors.foreground,
            paddingVertical: 16,
            borderRadius: 8,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: 8,
            opacity: isSaving ? 0.7 : 1,
          }}
        >
          {isSaving ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <>
              <Save size={20} color={colors.background} />
              <Text
                style={{
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 15,
                  color: colors.background,
                }}
              >
                Save Changes
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = {
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: "#0A0A0A",
    marginBottom: 12,
  },
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
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingVertical: 8,
  },
  switchLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: "#0A0A0A",
  },
};
