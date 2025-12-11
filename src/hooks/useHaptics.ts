/**
 * Haptic Feedback System
 *
 * Provides tactile feedback for mobile interactions.
 * Uses the Vibration API with fallback patterns.
 *
 * Haptic patterns are designed to feel natural and not annoying:
 * - Light: Quick tap for selections
 * - Medium: Confirmation of actions
 * - Heavy: Important events (success, error)
 * - Success: Celebratory double-tap
 * - Error: Distinct warning pattern
 * - Selection: Subtle feedback for toggles/options
 */

import { logger } from "@/lib/logger";

type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning' | 'selection' | 'impact';

interface HapticOptions {
  /** Force haptic even if user preference is to reduce motion */
  force?: boolean;
}

// Vibration patterns in milliseconds
// Format: [vibrate, pause, vibrate, pause, ...]
const HAPTIC_PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,           // Quick subtle tap
  medium: 25,          // Standard feedback
  heavy: 50,           // Strong feedback
  success: [30, 50, 30], // Double tap for success
  error: [50, 30, 50, 30, 50], // Triple pulse for error
  warning: [40, 20, 40], // Double pulse for warning
  selection: 15,       // Subtle selection feedback
  impact: 35,          // Button press impact
};

// Check if device supports haptics
const supportsHaptics = (): boolean => {
  if (typeof window === 'undefined') return false;
  return 'vibrate' in navigator;
};

// Check if user prefers reduced motion
const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Storage key for user haptic preference
const HAPTIC_PREF_KEY = '6seven_haptics_enabled';

// Get user's haptic preference from storage
const getHapticPreference = (): boolean => {
  if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem(HAPTIC_PREF_KEY);
  if (stored === null) return true; // Default to enabled
  return stored === 'true';
};

// Set user's haptic preference
const setHapticPreference = (enabled: boolean): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(HAPTIC_PREF_KEY, String(enabled));
};

/**
 * Trigger haptic feedback
 */
const triggerHaptic = (pattern: HapticPattern, options?: HapticOptions): boolean => {
  // Check if haptics are supported
  if (!supportsHaptics()) return false;

  // Check user preferences (unless forced)
  if (!options?.force) {
    if (prefersReducedMotion()) return false;
    if (!getHapticPreference()) return false;
  }

  try {
    const vibrationPattern = HAPTIC_PATTERNS[pattern];
    navigator.vibrate(vibrationPattern);
    return true;
  } catch (error) {
    logger.warn('Haptic feedback failed', error);
    return false;
  }
};

/**
 * Custom hook for haptic feedback
 *
 * @example
 * const { haptic, isSupported, isEnabled, setEnabled } = useHaptics();
 *
 * // Trigger feedback
 * haptic('success');
 *
 * // With button
 * <Button onClick={() => { haptic('impact'); doAction(); }}>
 */
export function useHaptics() {
  const isSupported = supportsHaptics();
  const isEnabled = getHapticPreference();

  const haptic = (pattern: HapticPattern, options?: HapticOptions): boolean => {
    return triggerHaptic(pattern, options);
  };

  const setEnabled = (enabled: boolean): void => {
    setHapticPreference(enabled);
  };

  // Convenience methods
  const light = (options?: HapticOptions) => haptic('light', options);
  const medium = (options?: HapticOptions) => haptic('medium', options);
  const heavy = (options?: HapticOptions) => haptic('heavy', options);
  const success = (options?: HapticOptions) => haptic('success', options);
  const error = (options?: HapticOptions) => haptic('error', options);
  const warning = (options?: HapticOptions) => haptic('warning', options);
  const selection = (options?: HapticOptions) => haptic('selection', options);
  const impact = (options?: HapticOptions) => haptic('impact', options);

  return {
    // Main function
    haptic,

    // State
    isSupported,
    isEnabled,
    setEnabled,

    // Convenience methods
    light,
    medium,
    heavy,
    success,
    error,
    warning,
    selection,
    impact,
  };
}

// Standalone functions for use outside React
export const haptics = {
  trigger: triggerHaptic,
  isSupported: supportsHaptics,
  light: (options?: HapticOptions) => triggerHaptic('light', options),
  medium: (options?: HapticOptions) => triggerHaptic('medium', options),
  heavy: (options?: HapticOptions) => triggerHaptic('heavy', options),
  success: (options?: HapticOptions) => triggerHaptic('success', options),
  error: (options?: HapticOptions) => triggerHaptic('error', options),
  warning: (options?: HapticOptions) => triggerHaptic('warning', options),
  selection: (options?: HapticOptions) => triggerHaptic('selection', options),
  impact: (options?: HapticOptions) => triggerHaptic('impact', options),
};

export type { HapticPattern, HapticOptions };
