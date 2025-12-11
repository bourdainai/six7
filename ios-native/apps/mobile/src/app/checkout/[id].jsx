import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Check, Wallet, CreditCard } from "lucide-react-native";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase, getListingById } from "@/utils/supabaseClient";
import { useAuth } from "@/utils/auth/useAuth";

const colors = {
  background: "#FFFFFF",
  foreground: "#0A0A0A",
  gray: "#666666",
  lightGray: "#F8F8F8",
  border: "#E5E5E5",
};

export default function Checkout() {
  const params = useLocalSearchParams();
  const { id, variant: variantId } = params;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  const [paymentMethod, setPaymentMethod] = useState("stripe"); // 'stripe' or 'wallet'
  const [shippingAddress, setShippingAddress] = useState({
    name: "",
    line1: "",
    line2: "",
    city: "",
    postal_code: "",
    country: "GB",
  });
  const [loading, setLoading] = useState(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Fetch listing
  const { data: listing, isLoading } = useQuery({
    queryKey: ["listing", id],
    queryFn: () => getListingById(id),
    enabled: !!id,
  });

  // Fetch variant if provided
  const { data: variant } = useQuery({
    queryKey: ["variant", variantId],
    queryFn: async () => {
      if (!variantId) return null;
      const { data, error } = await supabase
        .from("listing_variants")
        .select("*")
        .eq("id", variantId)
        .eq("is_available", true)
        .eq("is_sold", false)
        .single();
      
      if (error) return null;
      return data;
    },
    enabled: !!variantId,
  });

  // Fetch wallet balance
  const { data: walletBalance } = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { data, error } = await supabase
        .from("wallet_accounts")
        .select("balance")
        .eq("user_id", user.id)
        .single();
      
      if (error) return 0;
      return Number(data?.balance || 0);
    },
    enabled: !!user?.id,
  });

  // Calculate totals
  const itemPrice = variant 
    ? Number(variant.variant_price || 0)
    : listing 
    ? Number(listing.seller_price || 0) 
    : 0;
  const shippingCost = listing?.free_shipping ? 0 : (Number(listing?.shipping_cost_uk) || 5.99);
  const total = itemPrice + shippingCost;

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("You must be signed in to checkout");

      const requestBody = {
        listingId: id,
        shippingAddress,
      };

      // Add variant ID if purchasing a variant
      if (variantId) {
        requestBody.variantId = variantId;
      }

      if (paymentMethod === "wallet") {
        // Use wallet purchase
        const { data, error } = await supabase.functions.invoke("wallet-purchase", {
          body: requestBody,
        });

        if (error) throw error;
        return data;
      } else {
        // Use Stripe checkout
        const { data, error } = await supabase.functions.invoke("create-checkout", {
          body: requestBody,
        });

        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data) => {
      Alert.alert(
        "Order Placed!",
        "Your order has been successfully placed.",
        [
          {
            text: "OK",
            onPress: () => router.push(`/orders?order=${data.orderId}`),
          },
        ]
      );
    },
    onError: (error) => {
      Alert.alert("Checkout Failed", error.message || "An error occurred");
    },
  });

  const handleCheckout = () => {
    // Validate shipping address
    if (!shippingAddress.name || !shippingAddress.line1 || !shippingAddress.city || !shippingAddress.postal_code) {
      Alert.alert("Invalid Address", "Please fill in all required address fields");
      return;
    }

    // Check wallet balance if using wallet
    if (paymentMethod === "wallet" && walletBalance < total) {
      Alert.alert(
        "Insufficient Funds",
        `You need £${total.toFixed(2)} but only have £${walletBalance.toFixed(2)} in your wallet.`
      );
      return;
    }

    checkoutMutation.mutate();
  };

  if (!fontsLoaded || isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.foreground} />
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center", padding: 20 }}>
        <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 16, color: colors.gray, textAlign: "center" }}>
          Listing not found
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginTop: 16, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: colors.foreground, borderRadius: 8 }}
        >
          <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 15, color: colors.background }}>
            Go Back
          </Text>
        </TouchableOpacity>
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
          paddingBottom: 12,
          paddingHorizontal: 20,
          flexDirection: "row",
          alignItems: "center",
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
          <ArrowLeft size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={{ fontFamily: "Inter_700Bold", fontSize: 20, color: colors.foreground }}>
          Checkout
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: 20,
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Order Summary */}
        <View style={{ marginBottom: 32 }}>
          <Text style={{ fontFamily: "Inter_700Bold", fontSize: 18, color: colors.foreground, marginBottom: 16 }}>
            Order Summary
          </Text>
          <View
            style={{
              backgroundColor: colors.lightGray,
              borderRadius: 12,
              padding: 16,
            }}
          >
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 15,
                color: colors.foreground,
                marginBottom: 8,
              }}
            >
              {variant ? `${listing.title} - ${variant.variant_title || 'Variant'}` : listing.title}
            </Text>
            {variant && (
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 13,
                  color: colors.gray,
                  marginBottom: 8,
                }}
              >
                Condition: {variant.variant_condition || 'N/A'}
              </Text>
            )}
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12 }}>
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: colors.gray }}>
                Item Price
              </Text>
              <Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: colors.foreground }}>
                £{itemPrice.toFixed(2)}
              </Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: colors.gray }}>
                Shipping
              </Text>
              <Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: colors.foreground }}>
                {listing.free_shipping ? "Free" : `£${shippingCost.toFixed(2)}`}
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 16,
                paddingTop: 16,
                borderTopWidth: 1,
                borderTopColor: colors.border,
              }}
            >
              <Text style={{ fontFamily: "Inter_700Bold", fontSize: 18, color: colors.foreground }}>
                Total
              </Text>
              <Text style={{ fontFamily: "Inter_700Bold", fontSize: 18, color: colors.foreground }}>
                £{total.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Shipping Address */}
        <View style={{ marginBottom: 32 }}>
          <Text style={{ fontFamily: "Inter_700Bold", fontSize: 18, color: colors.foreground, marginBottom: 16 }}>
            Shipping Address
          </Text>
          <View style={{ gap: 16 }}>
            <View>
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.foreground, marginBottom: 8 }}>
                Full Name *
              </Text>
              <TextInput
                value={shippingAddress.name}
                onChangeText={(text) => setShippingAddress({ ...shippingAddress, name: text })}
                placeholder="Enter your full name"
                placeholderTextColor={colors.gray}
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 15,
                  color: colors.foreground,
                  backgroundColor: colors.lightGray,
                  borderRadius: 8,
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              />
            </View>

            <View>
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.foreground, marginBottom: 8 }}>
                Address Line 1 *
              </Text>
              <TextInput
                value={shippingAddress.line1}
                onChangeText={(text) => setShippingAddress({ ...shippingAddress, line1: text })}
                placeholder="Street address"
                placeholderTextColor={colors.gray}
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 15,
                  color: colors.foreground,
                  backgroundColor: colors.lightGray,
                  borderRadius: 8,
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              />
            </View>

            <View>
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.foreground, marginBottom: 8 }}>
                Address Line 2
              </Text>
              <TextInput
                value={shippingAddress.line2}
                onChangeText={(text) => setShippingAddress({ ...shippingAddress, line2: text })}
                placeholder="Apartment, suite, etc."
                placeholderTextColor={colors.gray}
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 15,
                  color: colors.foreground,
                  backgroundColor: colors.lightGray,
                  borderRadius: 8,
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              />
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.foreground, marginBottom: 8 }}>
                  City *
                </Text>
                <TextInput
                  value={shippingAddress.city}
                  onChangeText={(text) => setShippingAddress({ ...shippingAddress, city: text })}
                  placeholder="City"
                  placeholderTextColor={colors.gray}
                  style={{
                    fontFamily: "Inter_400Regular",
                    fontSize: 15,
                    color: colors.foreground,
                    backgroundColor: colors.lightGray,
                    borderRadius: 8,
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.foreground, marginBottom: 8 }}>
                  Postcode *
                </Text>
                <TextInput
                  value={shippingAddress.postal_code}
                  onChangeText={(text) => setShippingAddress({ ...shippingAddress, postal_code: text })}
                  placeholder="Postcode"
                  placeholderTextColor={colors.gray}
                  style={{
                    fontFamily: "Inter_400Regular",
                    fontSize: 15,
                    color: colors.foreground,
                    backgroundColor: colors.lightGray,
                    borderRadius: 8,
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Payment Method */}
        <View style={{ marginBottom: 32 }}>
          <Text style={{ fontFamily: "Inter_700Bold", fontSize: 18, color: colors.foreground, marginBottom: 16 }}>
            Payment Method
          </Text>
          <View style={{ gap: 12 }}>
            <TouchableOpacity
              onPress={() => setPaymentMethod("wallet")}
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 16,
                backgroundColor: paymentMethod === "wallet" ? colors.lightGray : colors.background,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: paymentMethod === "wallet" ? colors.foreground : colors.border,
              }}
            >
              <Wallet size={24} color={paymentMethod === "wallet" ? colors.foreground : colors.gray} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 15, color: colors.foreground }}>
                  Wallet
                </Text>
                <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: colors.gray, marginTop: 2 }}>
                  Balance: £{walletBalance?.toFixed(2) || "0.00"}
                </Text>
              </View>
              {paymentMethod === "wallet" && <Check size={24} color={colors.foreground} />}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setPaymentMethod("stripe")}
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 16,
                backgroundColor: paymentMethod === "stripe" ? colors.lightGray : colors.background,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: paymentMethod === "stripe" ? colors.foreground : colors.border,
              }}
            >
              <CreditCard size={24} color={paymentMethod === "stripe" ? colors.foreground : colors.gray} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 15, color: colors.foreground }}>
                  Credit/Debit Card
                </Text>
                <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: colors.gray, marginTop: 2 }}>
                  Secure payment via Stripe
                </Text>
              </View>
              {paymentMethod === "stripe" && <Check size={24} color={colors.foreground} />}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Checkout Button */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingBottom: insets.bottom + 12,
          paddingTop: 12,
          paddingHorizontal: 20,
        }}
      >
        <TouchableOpacity
          onPress={handleCheckout}
          disabled={checkoutMutation.isPending}
          style={{
            backgroundColor: colors.foreground,
            borderRadius: 8,
            paddingVertical: 16,
            alignItems: "center",
            opacity: checkoutMutation.isPending ? 0.6 : 1,
          }}
        >
          {checkoutMutation.isPending ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 16, color: colors.background }}>
              Complete Purchase - £{total.toFixed(2)}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}


