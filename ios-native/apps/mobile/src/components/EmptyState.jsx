import React, { memo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Package, Search, MessageCircle, Heart, ShoppingBag } from "lucide-react-native";
import { staticColors } from "@/theme/useAppColors";
import haptics from "@/utils/haptics";

/**
 * Reusable empty state component for lists and screens
 */
const EmptyState = memo(({
  icon = "package",
  title = "Nothing here yet",
  message = "Check back later",
  actionLabel,
  onAction,
  style,
}) => {
  const colors = staticColors;

  const getIcon = () => {
    const iconProps = { size: 48, color: colors.gray, strokeWidth: 1.5 };
    switch (icon) {
      case "search":
        return <Search {...iconProps} />;
      case "message":
        return <MessageCircle {...iconProps} />;
      case "heart":
        return <Heart {...iconProps} />;
      case "shopping":
        return <ShoppingBag {...iconProps} />;
      case "package":
      default:
        return <Package {...iconProps} />;
    }
  };

  const handleAction = () => {
    haptics.lightTap();
    onAction?.();
  };

  return (
    <View
      style={[
        {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 40,
          paddingVertical: 60,
        },
        style,
      ]}
    >
      <View
        style={{
          width: 100,
          height: 100,
          backgroundColor: colors.lightGray,
          borderRadius: 50,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
        }}
      >
        {getIcon()}
      </View>

      <Text
        style={{
          fontFamily: "Inter_700Bold",
          fontSize: 20,
          color: colors.foreground,
          marginBottom: 8,
          textAlign: "center",
          letterSpacing: -0.5,
        }}
      >
        {title}
      </Text>

      <Text
        style={{
          fontFamily: "Inter_400Regular",
          fontSize: 14,
          color: colors.gray,
          textAlign: "center",
          lineHeight: 22,
          marginBottom: actionLabel ? 24 : 0,
        }}
      >
        {message}
      </Text>

      {actionLabel && onAction && (
        <TouchableOpacity
          onPress={handleAction}
          accessibilityLabel={actionLabel}
          accessibilityRole="button"
          style={{
            backgroundColor: colors.foreground,
            paddingHorizontal: 24,
            paddingVertical: 12,
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
            {actionLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

EmptyState.displayName = "EmptyState";

export default EmptyState;
