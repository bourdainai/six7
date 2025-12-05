import { useColorScheme } from "react-native";

export const useTheme = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const colors = {
    background: isDark ? "#121212" : "#F4F6FF",
    cardBackground: isDark ? "#1E1E1E" : "white",
    primaryText: isDark ? "rgba(255, 255, 255, 0.87)" : "#263255",
    secondaryText: isDark ? "rgba(255, 255, 255, 0.60)" : "#8FA1D4",
    tertiaryText: isDark ? "rgba(255, 255, 255, 0.50)" : "#9AA4CE",
    quaternaryText: isDark ? "rgba(255, 255, 255, 0.40)" : "#C4C9EC",
    border: isDark ? "rgba(255, 255, 255, 0.12)" : "#EBEEFF",
    searchBackground: isDark ? "rgba(255, 255, 255, 0.08)" : "#EEF2FF",
    accent: isDark ? "#4A90FF" : "#2F7BFF",
    accentLight: isDark ? "rgba(74, 144, 255, 0.12)" : "#EEF2FF",
    accentText: isDark ? "rgba(74, 144, 255, 0.80)" : "#CBD4FA",
  };

  return { colors, isDark };
};
