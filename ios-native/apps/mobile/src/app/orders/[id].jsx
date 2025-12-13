import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  Package,
  CheckCircle,
  Truck,
  Clock,
  MapPin,
  MessageCircle,
  AlertCircle,
  Tag,
  ExternalLink,
} from "lucide-react-native";
import * as Linking from "expo-linking";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/utils/auth/useAuth";
import { format } from "date-fns";

const colors = {
  background: "#FFFFFF",
  foreground: "#0A0A0A",
  gray: "#666666",
  lightGray: "#F8F8F8",
  border: "#E5E5E5",
  green: "#10B981",
  yellow: "#F59E0B",
  red: "#EF4444",
  blue: "#3B82F6",
};

export default function OrderDetail() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id: orderId } = useLocalSearchParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Fetch order details
  const { data: order, isLoading, refetch } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      if (!orderId) return null;

      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items(
            *,
            listing:listings(
              id,
              title,
              condition,
              listing_images(image_url)
            ),
            variant:listing_variants(id, variant_name, variant_price, variant_condition)
          ),
          seller:profiles!seller_id(id, full_name, avatar_url),
          buyer:profiles!buyer_id(id, full_name, avatar_url),
          shipping_details(*)
        `)
        .eq("id", orderId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleCreateShippingLabel = async () => {
    if (!order || !shippingAddress) {
      Alert.alert("Error", "Shipping address not available");
      return;
    }

    setIsCreatingLabel(true);
    try {
      // Call the create-shipping-label edge function
      const { data, error } = await supabase.functions.invoke("sendcloud-create-label", {
        body: {
          order_id: orderId,
          to_name: shippingAddress.name,
          to_address: shippingAddress.line1,
          to_address_2: shippingAddress.line2 || "",
          to_city: shippingAddress.city,
          to_postal_code: shippingAddress.postal_code,
          to_country: shippingAddress.country || "GB",
          weight: 100, // Default weight in grams
        },
      });

      if (error) throw error;

      if (data?.label_url) {
        Alert.alert(
          "Shipping Label Created",
          "Your shipping label has been created. Would you like to view it?",
          [
            { text: "Later", style: "cancel" },
            {
              text: "View Label",
              onPress: () => Linking.openURL(data.label_url),
            },
          ]
        );
      } else {
        Alert.alert("Success", "Shipping label created. Check your email for the label.");
      }

      // Update local shipping status
      await supabase
        .from("shipping_details")
        .upsert({
          order_id: orderId,
          status: "shipped",
          tracking_number: data?.tracking_number || null,
          carrier: data?.carrier || "Royal Mail",
          label_url: data?.label_url || null,
        });

      // Refresh the order
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      refetch();
    } catch (error) {
      console.error("Error creating shipping label:", error);
      Alert.alert("Error", error.message || "Failed to create shipping label. Please try again.");
    } finally {
      setIsCreatingLabel(false);
    }
  };

  const handleMarkAsShipped = async () => {
    Alert.alert(
      "Mark as Shipped",
      "Enter the tracking number or skip to mark as shipped without tracking.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Skip (No Tracking)",
          onPress: async () => {
            try {
              await supabase
                .from("shipping_details")
                .upsert({
                  order_id: orderId,
                  status: "shipped",
                  carrier: "Seller Shipping",
                });

              Alert.alert("Success", "Order marked as shipped");
              queryClient.invalidateQueries({ queryKey: ["order", orderId] });
              refetch();
            } catch (error) {
              Alert.alert("Error", "Failed to update shipping status");
            }
          },
        },
      ]
    );
  };

  if (!fontsLoaded) {
    return null;
  }

  const isBuyer = order?.buyer_id === user?.id;
  const isSeller = order?.seller_id === user?.id;
  const shippingDetail = order?.shipping_details?.[0];
  const shippingAddress = order?.shipping_address;

  const getStatusIcon = (status) => {
    switch (status) {
      case "delivered":
        return <CheckCircle size={24} color={colors.green} />;
      case "shipped":
      case "in_transit":
        return <Truck size={24} color={colors.yellow} />;
      case "paid":
        return <Package size={24} color={colors.blue} />;
      default:
        return <Clock size={24} color={colors.gray} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "delivered":
      case "completed":
        return colors.green;
      case "shipped":
      case "in_transit":
        return colors.yellow;
      case "paid":
        return colors.blue;
      default:
        return colors.gray;
    }
  };

  const trackingSteps = [
    { key: "paid", label: "Order Placed", icon: Package },
    { key: "shipped", label: "Shipped", icon: Truck },
    { key: "in_transit", label: "In Transit", icon: Truck },
    { key: "delivered", label: "Delivered", icon: CheckCircle },
  ];

  const getStepStatus = (stepKey, currentStatus) => {
    const statusOrder = ["pending", "paid", "shipped", "in_transit", "delivered", "completed"];
    const currentIndex = statusOrder.indexOf(currentStatus || "pending");
    const stepIndex = statusOrder.indexOf(stepKey);
    if (stepIndex < currentIndex) return "completed";
    if (stepIndex === currentIndex) return "active";
    return "pending";
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={colors.foreground} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        <StatusBar style="dark" />
        <View style={{ paddingHorizontal: 20, paddingVertical: 12, flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.foreground} />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 40 }}>
          <AlertCircle size={64} color={colors.gray} />
          <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 18, color: colors.foreground, marginTop: 16 }}>
            Order Not Found
          </Text>
        </View>
      </View>
    );
  }

  const currentStatus = shippingDetail?.status || order.status;

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
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: "Inter_700Bold", fontSize: 20, color: colors.foreground }}>
            Order Details
          </Text>
          <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.gray }}>
            #{orderId?.slice(0, 8).toUpperCase()}
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 20,
          paddingBottom: insets.bottom + 40,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.foreground} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Status Card */}
        <View
          style={{
            backgroundColor: colors.lightGray,
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
            {getStatusIcon(currentStatus)}
            <View style={{ marginLeft: 12 }}>
              <Text
                style={{
                  fontFamily: "Inter_700Bold",
                  fontSize: 18,
                  color: getStatusColor(currentStatus),
                  textTransform: "capitalize",
                }}
              >
                {currentStatus?.replace("_", " ")}
              </Text>
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: colors.gray }}>
                {format(new Date(order.created_at), "MMM d, yyyy 'at' h:mm a")}
              </Text>
            </View>
          </View>

          {/* Tracking Timeline */}
          <View style={{ marginTop: 8 }}>
            {trackingSteps.map((step, index) => {
              const stepStatus = getStepStatus(step.key, currentStatus);
              const Icon = step.icon;
              const isLast = index === trackingSteps.length - 1;

              return (
                <View key={step.key} style={{ flexDirection: "row" }}>
                  <View style={{ alignItems: "center", width: 40 }}>
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor:
                          stepStatus === "completed"
                            ? colors.green
                            : stepStatus === "active"
                            ? colors.blue
                            : colors.border,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon
                        size={16}
                        color={
                          stepStatus === "pending" ? colors.gray : colors.background
                        }
                      />
                    </View>
                    {!isLast && (
                      <View
                        style={{
                          width: 2,
                          height: 24,
                          backgroundColor:
                            stepStatus === "completed" ? colors.green : colors.border,
                        }}
                      />
                    )}
                  </View>
                  <View style={{ flex: 1, paddingBottom: isLast ? 0 : 16 }}>
                    <Text
                      style={{
                        fontFamily:
                          stepStatus === "active" ? "Inter_600SemiBold" : "Inter_400Regular",
                        fontSize: 14,
                        color:
                          stepStatus === "pending" ? colors.gray : colors.foreground,
                        marginTop: 6,
                      }}
                    >
                      {step.label}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Tracking Number */}
          {shippingDetail?.tracking_number && (
            <View
              style={{
                marginTop: 16,
                paddingTop: 16,
                borderTopWidth: 1,
                borderTopColor: colors.border,
              }}
            >
              <Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: colors.gray }}>
                Tracking Number
              </Text>
              <Text
                style={{
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 15,
                  color: colors.foreground,
                  marginTop: 4,
                }}
              >
                {shippingDetail.tracking_number}
              </Text>
              {shippingDetail.carrier && (
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    fontSize: 13,
                    color: colors.gray,
                    marginTop: 2,
                  }}
                >
                  via {shippingDetail.carrier}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Order Items */}
        <View style={{ marginBottom: 20 }}>
          <Text
            style={{
              fontFamily: "Inter_700Bold",
              fontSize: 18,
              color: colors.foreground,
              marginBottom: 12,
            }}
          >
            Items
          </Text>
          {order.order_items?.map((item, index) => {
            const listing = item.listing;
            const imageUrl = listing?.listing_images?.[0]?.image_url;

            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => router.push(`/listing/${listing?.id}`)}
                style={{
                  flexDirection: "row",
                  backgroundColor: colors.lightGray,
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 8,
                }}
              >
                {imageUrl ? (
                  <Image
                    source={{ uri: imageUrl }}
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 8,
                      marginRight: 12,
                    }}
                  />
                ) : (
                  <View
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 8,
                      backgroundColor: colors.border,
                      marginRight: 12,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Package size={24} color={colors.gray} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: "Inter_500Medium",
                      fontSize: 14,
                      color: colors.foreground,
                    }}
                    numberOfLines={2}
                  >
                    {listing?.title || "Item"}
                  </Text>
                  {item.variant && (
                    <Text
                      style={{
                        fontFamily: "Inter_400Regular",
                        fontSize: 12,
                        color: colors.gray,
                        marginTop: 2,
                      }}
                    >
                      {item.variant.variant_name}
                    </Text>
                  )}
                  <Text
                    style={{
                      fontFamily: "Inter_700Bold",
                      fontSize: 14,
                      color: colors.foreground,
                      marginTop: 4,
                    }}
                  >
                    £{Number(item.price || 0).toFixed(2)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Shipping Address */}
        {shippingAddress && (
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontFamily: "Inter_700Bold",
                fontSize: 18,
                color: colors.foreground,
                marginBottom: 12,
              }}
            >
              Shipping Address
            </Text>
            <View
              style={{
                backgroundColor: colors.lightGray,
                borderRadius: 12,
                padding: 16,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                <MapPin size={20} color={colors.gray} style={{ marginRight: 12, marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: "Inter_500Medium",
                      fontSize: 14,
                      color: colors.foreground,
                    }}
                  >
                    {shippingAddress.name}
                  </Text>
                  <Text
                    style={{
                      fontFamily: "Inter_400Regular",
                      fontSize: 13,
                      color: colors.gray,
                      marginTop: 4,
                    }}
                  >
                    {shippingAddress.line1}
                    {shippingAddress.line2 ? `\n${shippingAddress.line2}` : ""}
                    {`\n${shippingAddress.city}, ${shippingAddress.postal_code}`}
                    {`\n${shippingAddress.country}`}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Order Summary */}
        <View style={{ marginBottom: 20 }}>
          <Text
            style={{
              fontFamily: "Inter_700Bold",
              fontSize: 18,
              color: colors.foreground,
              marginBottom: 12,
            }}
          >
            Order Summary
          </Text>
          <View
            style={{
              backgroundColor: colors.lightGray,
              borderRadius: 12,
              padding: 16,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: colors.gray }}>
                Subtotal
              </Text>
              <Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: colors.foreground }}>
                £{Number(order.total_amount - (order.platform_fee || 0)).toFixed(2)}
              </Text>
            </View>
            {order.platform_fee > 0 && (
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: colors.gray }}>
                  Fees
                </Text>
                <Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: colors.foreground }}>
                  £{Number(order.platform_fee || 0).toFixed(2)}
                </Text>
              </View>
            )}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingTop: 8,
                borderTopWidth: 1,
                borderTopColor: colors.border,
              }}
            >
              <Text style={{ fontFamily: "Inter_700Bold", fontSize: 16, color: colors.foreground }}>
                Total
              </Text>
              <Text style={{ fontFamily: "Inter_700Bold", fontSize: 16, color: colors.foreground }}>
                £{Number(order.total_amount || 0).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Seller Shipping Actions */}
        {isSeller && order.status === "paid" && (!shippingDetail || shippingDetail.status === "pending") && (
          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontFamily: "Inter_700Bold",
                fontSize: 18,
                color: colors.foreground,
                marginBottom: 12,
              }}
            >
              Ship This Order
            </Text>
            <View style={{ gap: 10 }}>
              <TouchableOpacity
                onPress={handleCreateShippingLabel}
                disabled={isCreatingLabel}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors.blue,
                  borderRadius: 12,
                  paddingVertical: 16,
                  gap: 8,
                  opacity: isCreatingLabel ? 0.7 : 1,
                }}
              >
                {isCreatingLabel ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <>
                    <Tag size={20} color={colors.background} />
                    <Text
                      style={{
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 16,
                        color: colors.background,
                      }}
                    >
                      Create Shipping Label
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleMarkAsShipped}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors.lightGray,
                  borderRadius: 12,
                  paddingVertical: 16,
                  gap: 8,
                }}
              >
                <Truck size={20} color={colors.foreground} />
                <Text
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 16,
                    color: colors.foreground,
                  }}
                >
                  Mark as Shipped (Own Label)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* View Shipping Label (if exists) */}
        {shippingDetail?.label_url && (
          <TouchableOpacity
            onPress={() => Linking.openURL(shippingDetail.label_url)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.green + "20",
              borderRadius: 12,
              paddingVertical: 16,
              gap: 8,
              marginBottom: 16,
            }}
          >
            <ExternalLink size={20} color={colors.green} />
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 16,
                color: colors.green,
              }}
            >
              View Shipping Label
            </Text>
          </TouchableOpacity>
        )}

        {/* Contact Button */}
        <TouchableOpacity
          onPress={() => {
            // Find or create conversation with seller/buyer
            Alert.alert("Contact", "This will open a conversation with the " + (isBuyer ? "seller" : "buyer"));
          }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.foreground,
            borderRadius: 12,
            paddingVertical: 16,
            gap: 8,
          }}
        >
          <MessageCircle size={20} color={colors.background} />
          <Text
            style={{
              fontFamily: "Inter_600SemiBold",
              fontSize: 16,
              color: colors.background,
            }}
          >
            Contact {isBuyer ? "Seller" : "Buyer"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}


