// 6Seven Brand Colors - Minimalist Design System
export const colors = {
  // Core Brand Colors
  background: "#FFFFFF", // Pure white
  foreground: "#000000", // True black
  carbonBlack: "#0A0A0A", // Dark UI elements
  graphiteGray: "#2A2A2A", // Secondary text
  softNeutral: "#F5F5F5", // Backgrounds
  dividerGray: "#EDEDED", // Borders/dividers
  silverChrome: "#CFCFCF", // Accents
  futureCyan: "#A8F4FF", // Highlight accents

  // Functional Colors
  destructive: "hsl(0, 84%, 60%)", // Errors/alerts
  live: "#22C55E", // Live badges/status

  // Dark Mode (if needed later)
  dark: {
    background: "#0A0A0A",
    foreground: "#FFFFFF",
    card: "#1A1A1A",
    border: "#2A2A2A",
  },
};

// Typography
export const typography = {
  fontFamily: "Inter_400Regular",
  fontFamilySemiBold: "Inter_600SemiBold",
  fontFamilyBold: "Inter_700Bold",
};

// Design System
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  none: 0, // Sharp corners by default
  sm: 4, // Minimal rounding if needed
  md: 8,
  lg: 12,
  full: 9999,
};
