import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

/**
 * Haptic feedback utilities for iOS app
 * Provides tactile feedback for important interactions
 */

// Light tap - for selections, toggles
export const lightTap = () => {
  if (Platform.OS === "ios") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
};

// Medium tap - for button presses, confirmations
export const mediumTap = () => {
  if (Platform.OS === "ios") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
};

// Heavy tap - for important actions, purchases
export const heavyTap = () => {
  if (Platform.OS === "ios") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }
};

// Success - for completed actions
export const success = () => {
  if (Platform.OS === "ios") {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
};

// Warning - for warnings, confirmations
export const warning = () => {
  if (Platform.OS === "ios") {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }
};

// Error - for errors, failed actions
export const error = () => {
  if (Platform.OS === "ios") {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }
};

// Selection change - for pickers, toggles
export const selection = () => {
  if (Platform.OS === "ios") {
    Haptics.selectionAsync();
  }
};

export default {
  lightTap,
  mediumTap,
  heavyTap,
  success,
  warning,
  error,
  selection,
};
