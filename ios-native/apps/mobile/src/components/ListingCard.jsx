import React, { memo, useCallback } from "react";
import { View, Text, TouchableOpacity, Image, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { Heart, Package } from "lucide-react-native";
import { staticColors } from "@/theme/useAppColors";
import haptics from "@/utils/haptics";

const { width: screenWidth } = Dimensions.get("window");
const CARD_WIDTH = (screenWidth - 48 - 12) / 2;

/**
 * Reusable, memoized ListingCard component
 * Used in home, browse, profile, and search results
 */
const ListingCard = memo(
  ({
    listing,
    onPress,
    onSave,
    isSaved = false,
    showSaveButton = true,
    style,
  }) => {
    const router = useRouter();
    const colors = staticColors;

    const imageUrl = listing.listing_images?.sort(
      (a, b) => (a.display_order || 0) - (b.display_order || 0)
    )?.[0]?.image_url;

    const handlePress = useCallback(() => {
      haptics.lightTap();
      if (onPress) {
        onPress(listing);
      } else {
        router.push(`/listing/${listing.id}`);
      }
    }, [listing, onPress, router]);

    const handleSave = useCallback(
      (e) => {
        e?.stopPropagation?.();
        haptics.mediumTap();
        onSave?.(listing);
      },
      [listing, onSave]
    );

    const formatCondition = (condition) => {
      const labels = {
        new_with_tags: "New",
        like_new: "Like New",
        excellent: "Excellent",
        good: "Good",
        fair: "Fair",
      };
      return labels[condition] || condition;
    };

    return (
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.7}
        accessibilityLabel={`${listing.title}, £${Number(listing.seller_price || 0).toFixed(2)}`}
        accessibilityRole="button"
        style={[
          {
            width: CARD_WIDTH,
            backgroundColor: colors.background,
            borderRadius: 12,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: colors.border,
          },
          style,
        ]}
      >
        {/* Image */}
        <View
          style={{
            width: CARD_WIDTH,
            height: CARD_WIDTH * 1.2,
            backgroundColor: colors.lightGray,
          }}
        >
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={{ width: "100%", height: "100%" }}
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
              <Package size={32} color={colors.gray} />
            </View>
          )}

          {/* Save Button */}
          {showSaveButton && onSave && (
            <TouchableOpacity
              onPress={handleSave}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel={isSaved ? "Remove from saved" : "Save listing"}
              accessibilityRole="button"
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: "rgba(255,255,255,0.9)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Heart
                size={18}
                color={isSaved ? colors.red : colors.foreground}
                fill={isSaved ? colors.red : "transparent"}
              />
            </TouchableOpacity>
          )}

          {/* Condition Badge */}
          {listing.condition && (
            <View
              style={{
                position: "absolute",
                bottom: 8,
                left: 8,
                backgroundColor: colors.foreground,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 4,
              }}
            >
              <Text
                style={{
                  fontFamily: "Inter_500Medium",
                  fontSize: 10,
                  color: colors.background,
                }}
              >
                {formatCondition(listing.condition)}
              </Text>
            </View>
          )}
        </View>

        {/* Details */}
        <View style={{ padding: 10 }}>
          <Text
            style={{
              fontFamily: "Inter_500Medium",
              fontSize: 13,
              color: colors.foreground,
              marginBottom: 4,
            }}
            numberOfLines={2}
          >
            {listing.title}
          </Text>
          <Text
            style={{
              fontFamily: "Inter_700Bold",
              fontSize: 16,
              color: colors.foreground,
            }}
          >
            £{Number(listing.seller_price || 0).toFixed(2)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison for memoization
    return (
      prevProps.listing?.id === nextProps.listing?.id &&
      prevProps.listing?.seller_price === nextProps.listing?.seller_price &&
      prevProps.listing?.title === nextProps.listing?.title &&
      prevProps.isSaved === nextProps.isSaved
    );
  }
);

ListingCard.displayName = "ListingCard";

export default ListingCard;
