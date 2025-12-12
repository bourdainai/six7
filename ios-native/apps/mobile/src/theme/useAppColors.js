import { useColorScheme } from "react-native";

/**
 * Centralized theme colors for 6Seven iOS app
 * All screens should import colors from this hook for consistency
 */
export const useAppColors = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return {
    // Core colors
    background: isDark ? "#0A0A0A" : "#FFFFFF",
    foreground: isDark ? "#FFFFFF" : "#0A0A0A",

    // Text colors
    gray: isDark ? "#A0A0A0" : "#666666",
    lightGray: isDark ? "#1A1A1A" : "#F8F8F8",

    // Borders
    border: isDark ? "#2A2A2A" : "#E5E5E5",

    // Status colors
    green: "#10B981",
    red: "#EF4444",
    amber: "#F59E0B",
    blue: "#3B82F6",

    // Interactive
    primary: isDark ? "#FFFFFF" : "#0A0A0A",
    primaryMuted: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",

    // Tab bar
    tabActive: isDark ? "#FFFFFF" : "#0A0A0A",
    tabInactive: isDark ? "#6B6B6B" : "#6B6B6B",

    // Cards
    card: isDark ? "#1A1A1A" : "#FFFFFF",
    cardBorder: isDark ? "#2A2A2A" : "#E5E5E5",

    // Overlays
    overlay: isDark ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.5)",

    // Message bubbles
    messageSent: isDark ? "#FFFFFF" : "#0A0A0A",
    messageReceived: isDark ? "#1A1A1A" : "#F0F0F0",
    messageSentText: isDark ? "#0A0A0A" : "#FFFFFF",
    messageReceivedText: isDark ? "#FFFFFF" : "#0A0A0A",

    // Helper for dark mode check
    isDark,
  };
};

// Static colors for components that can't use hooks (like outside components)
export const staticColors = {
  background: "#FFFFFF",
  foreground: "#0A0A0A",
  gray: "#666666",
  lightGray: "#F8F8F8",
  border: "#E5E5E5",
  green: "#10B981",
  red: "#EF4444",
  amber: "#F59E0B",
  blue: "#3B82F6",
};

export default useAppColors;
