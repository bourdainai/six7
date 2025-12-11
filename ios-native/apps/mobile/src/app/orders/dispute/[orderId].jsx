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
  AlertTriangle,
  Camera,
  X,
  Package,
  Ban,
  AlertCircle,
  HelpCircle,
  FileWarning,
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
  destructive: "#EF4444",
  success: "#22C55E",
};

const DISPUTE_TYPES = [
  { id: "item_not_received", label: "Item not received", icon: Package, description: "I haven't received my order" },
  { id: "item_not_as_described", label: "Item not as described", icon: AlertCircle, description: "The item differs from the listing" },
  { id: "damaged", label: "Damaged item", icon: FileWarning, description: "Item arrived damaged" },
  { id: "counterfeit", label: "Suspected counterfeit", icon: Ban, description: "I believe the item is fake" },
  { id: "missing_parts", label: "Missing parts", icon: AlertTriangle, description: "Item is incomplete" },
  { id: "other", label: "Other issue", icon: HelpCircle, description: "Something else went wrong" },
];

export default function DisputeOrderScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { orderId } = useLocalSearchParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [disputeType, setDisputeType] = useState(null);
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState([]);
  const [uploading, setUploading] = useState(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Fetch order details
  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ["order-for-dispute", orderId],
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

  // Check for existing dispute
  const { data: existingDispute } = useQuery({
    queryKey: ["existing-dispute", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("disputes")
        .select("id, status")
        .eq("order_id", orderId)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!orderId,
  });

  // Submit dispute mutation
  const submitDispute = useMutation({
    mutationFn: async () => {
      if (!disputeType) {
        throw new Error("Please select a dispute type");
      }
      if (!reason.trim()) {
        throw new Error("Please describe the issue");
      }

      // Upload evidence images if any
      let evidenceUrls = [];
      if (evidence.length > 0) {
        setUploading(true);
        for (const img of evidence) {
          const fileName = `dispute-${orderId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
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

          evidenceUrls.push(publicUrl);
        }
        setUploading(false);
      }

      const { data, error } = await supabase
        .from("disputes")
        .insert({
          order_id: orderId,
          listing_id: order.listing_id,
          buyer_id: user.id,
          seller_id: order.seller_id,
          dispute_type: disputeType,
          reason: reason.trim(),
          buyer_evidence: evidenceUrls.length > 0 ? { images: evidenceUrls } : null,
          status: "open",
        })
        .select()
        .single();

      if (error) throw error;

      // Trigger AI analysis (fire and forget)
      try {
        await supabase.functions.invoke("dispute-auto-summarizer", {
          body: { disputeId: data.id },
        });
      } catch (e) {
        console.log("AI analysis trigger:", e);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["orders"]);
      queryClient.invalidateQueries(["order-for-dispute", orderId]);
      Alert.alert(
        "Dispute Opened",
        "Your dispute has been submitted. Our team will review it within 24-48 hours.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    },
    onError: (error) => {
      Alert.alert("Error", error.message || "Failed to submit dispute");
    },
  });

  const pickImage = async () => {
    if (evidence.length >= 5) {
      Alert.alert("Limit Reached", "You can only add up to 5 photos as evidence");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled) {
      setEvidence([...evidence, result.assets[0]]);
    }
  };

  const removeImage = (index) => {
    setEvidence(evidence.filter((_, i) => i !== index));
  };

  if (!fontsLoaded || orderLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.foreground} />
      </View>
    );
  }

  if (existingDispute) {
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
          <AlertTriangle size={64} color={colors.warning} strokeWidth={1.5} />
          <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 18, color: colors.foreground, marginTop: 16, textAlign: "center" }}>
            Dispute Already Open
          </Text>
          <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: colors.gray, marginTop: 8, textAlign: "center" }}>
            A dispute for this order is already {existingDispute.status === "resolved" ? "resolved" : "being reviewed"}
          </Text>
        </View>
      </View>
    );
  }

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
            Open Dispute
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
        {/* Warning Banner */}
        <View
          style={{
            backgroundColor: `${colors.warning}15`,
            borderRadius: 12,
            padding: 16,
            flexDirection: "row",
            marginBottom: 24,
          }}
        >
          <AlertTriangle size={20} color={colors.warning} strokeWidth={2} style={{ marginRight: 12, marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.foreground, marginBottom: 4 }}>
              Before opening a dispute
            </Text>
            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: colors.gray, lineHeight: 20 }}>
              We recommend contacting the seller first to resolve the issue. Disputes may affect the seller's reputation.
            </Text>
          </View>
        </View>

        {/* Dispute Type Selection */}
        <Text
          style={{
            fontFamily: "Inter_600SemiBold",
            fontSize: 16,
            color: colors.foreground,
            marginBottom: 12,
          }}
        >
          What's the issue?
        </Text>
        <View style={{ marginBottom: 24 }}>
          {DISPUTE_TYPES.map((type) => {
            const Icon = type.icon;
            const isSelected = disputeType === type.id;
            return (
              <TouchableOpacity
                key={type.id}
                onPress={() => setDisputeType(type.id)}
                style={{
                  backgroundColor: isSelected ? `${colors.foreground}10` : colors.lightGray,
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 8,
                  flexDirection: "row",
                  alignItems: "center",
                  borderWidth: isSelected ? 2 : 0,
                  borderColor: colors.foreground,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: isSelected ? colors.foreground : colors.background,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                  }}
                >
                  <Icon size={20} color={isSelected ? colors.background : colors.foreground} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 14,
                      color: colors.foreground,
                    }}
                  >
                    {type.label}
                  </Text>
                  <Text
                    style={{
                      fontFamily: "Inter_400Regular",
                      fontSize: 12,
                      color: colors.gray,
                      marginTop: 2,
                    }}
                  >
                    {type.description}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Reason */}
        <Text
          style={{
            fontFamily: "Inter_600SemiBold",
            fontSize: 16,
            color: colors.foreground,
            marginBottom: 8,
          }}
        >
          Describe the issue
        </Text>
        <TextInput
          value={reason}
          onChangeText={setReason}
          placeholder="Please provide details about what went wrong..."
          placeholderTextColor={colors.gray}
          multiline
          numberOfLines={5}
          style={{
            backgroundColor: colors.lightGray,
            borderRadius: 12,
            padding: 16,
            fontFamily: "Inter_400Regular",
            fontSize: 14,
            color: colors.foreground,
            minHeight: 140,
            textAlignVertical: "top",
            marginBottom: 24,
          }}
        />

        {/* Evidence Upload */}
        <Text
          style={{
            fontFamily: "Inter_600SemiBold",
            fontSize: 16,
            color: colors.foreground,
            marginBottom: 8,
          }}
        >
          Add evidence (recommended)
        </Text>
        <Text
          style={{
            fontFamily: "Inter_400Regular",
            fontSize: 13,
            color: colors.gray,
            marginBottom: 12,
          }}
        >
          Photos help us resolve disputes faster
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 32 }}>
          {evidence.map((img, index) => (
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
                  backgroundColor: colors.destructive,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={14} color={colors.background} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          ))}
          {evidence.length < 5 && (
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
          onPress={() => submitDispute.mutate()}
          disabled={!disputeType || !reason.trim() || submitDispute.isPending || uploading}
          style={{
            backgroundColor: colors.destructive,
            borderRadius: 12,
            padding: 18,
            alignItems: "center",
            opacity: !disputeType || !reason.trim() || submitDispute.isPending || uploading ? 0.5 : 1,
          }}
        >
          {submitDispute.isPending || uploading ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 16,
                color: colors.background,
              }}
            >
              Submit Dispute
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
