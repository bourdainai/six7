import React, { memo, useCallback } from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { useRouter } from "expo-router";
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  ChevronRight,
} from "lucide-react-native";
import { format } from "date-fns";
import { staticColors } from "@/theme/useAppColors";
import haptics from "@/utils/haptics";

/**
 * Reusable, memoized OrderCard component
 * Used in orders list and seller dashboard
 */
const OrderCard = memo(
  ({ order, tab = "purchases", onPress }) => {
    const router = useRouter();
    const colors = staticColors;

    const handlePress = useCallback(() => {
      haptics.lightTap();
      if (onPress) {
        onPress(order);
      } else {
        router.push(`/orders/${order.id}`);
      }
    }, [order, onPress, router]);

    const getStatusIcon = (status) => {
      switch (status) {
        case "pending":
          return <Clock size={16} color={colors.amber} />;
        case "confirmed":
        case "processing":
          return <Package size={16} color={colors.blue} />;
        case "shipped":
          return <Truck size={16} color={colors.blue} />;
        case "delivered":
        case "completed":
          return <CheckCircle size={16} color={colors.green} />;
        case "cancelled":
        case "refunded":
          return <XCircle size={16} color={colors.red} />;
        default:
          return <Clock size={16} color={colors.gray} />;
      }
    };

    const getStatusColor = (status) => {
      switch (status) {
        case "pending":
          return colors.amber;
        case "confirmed":
        case "processing":
        case "shipped":
          return colors.blue;
        case "delivered":
        case "completed":
          return colors.green;
        case "cancelled":
        case "refunded":
          return colors.red;
        default:
          return colors.gray;
      }
    };

    const formatStatus = (status) => {
      return status?.charAt(0).toUpperCase() + status?.slice(1) || "Unknown";
    };

    const listing = order.listing;
    const imageUrl = listing?.listing_images?.[0]?.image_url;
    const otherUser = tab === "purchases" ? order.seller : order.buyer;

    return (
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.7}
        accessibilityLabel={`Order for ${listing?.title || "item"}, ${formatStatus(order.status)}`}
        accessibilityRole="button"
        style={{
          backgroundColor: colors.background,
          borderRadius: 12,
          padding: 16,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: colors.border,
          flexDirection: "row",
        }}
      >
        {/* Image */}
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 8,
            backgroundColor: colors.lightGray,
            overflow: "hidden",
            marginRight: 14,
          }}
        >
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={{ width: 80, height: 80 }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Package size={28} color={colors.gray} />
            </View>
          )}
        </View>

        {/* Details */}
        <View style={{ flex: 1 }}>
          {/* Title */}
          <Text
            style={{
              fontFamily: "Inter_600SemiBold",
              fontSize: 15,
              color: colors.foreground,
              marginBottom: 4,
            }}
            numberOfLines={1}
          >
            {listing?.title || "Order"}
          </Text>

          {/* Other user */}
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 13,
              color: colors.gray,
              marginBottom: 8,
            }}
          >
            {tab === "purchases" ? "From" : "To"}{" "}
            {otherUser?.full_name || "User"}
          </Text>

          {/* Status */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: getStatusColor(order.status) + "15",
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 6,
              }}
            >
              {getStatusIcon(order.status)}
              <Text
                style={{
                  fontFamily: "Inter_500Medium",
                  fontSize: 12,
                  color: getStatusColor(order.status),
                  marginLeft: 6,
                }}
              >
                {formatStatus(order.status)}
              </Text>
            </View>

            <Text
              style={{
                fontFamily: "Inter_700Bold",
                fontSize: 16,
                color: colors.foreground,
              }}
            >
              £{Number(order.total_amount || listing?.seller_price || 0).toFixed(2)}
            </Text>
          </View>

          {/* Date */}
          {order.created_at && (
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 11,
                color: colors.gray,
                marginTop: 6,
              }}
            >
              {format(new Date(order.created_at), "MMM d, yyyy")}
            </Text>
          )}
        </View>

        {/* Chevron */}
        <View style={{ justifyContent: "center", marginLeft: 8 }}>
          <ChevronRight size={20} color={colors.gray} />
        </View>
      </TouchableOpacity>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.order?.id === nextProps.order?.id &&
      prevProps.order?.status === nextProps.order?.status &&
      prevProps.tab === nextProps.tab
    );
  }
);

OrderCard.displayName = "OrderCard";

export default OrderCard;
