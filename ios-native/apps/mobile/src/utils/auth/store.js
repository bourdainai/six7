import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export const authKey = `${process.env.EXPO_PUBLIC_PROJECT_GROUP_ID}-jwt`;

/**
 * This store manages the authentication state of the application.
 */
export const useAuthStore = create((set) => ({
  isReady: false,
  auth: null,
  setAuth: (auth) => {
    if (auth) {
      SecureStore.setItemAsync(authKey, JSON.stringify(auth));
    } else {
      SecureStore.deleteItemAsync(authKey);
    }
    set({ auth });
  },
}));

/**
 * This store manages the state of the authentication modal.
 */
export const useAuthModal = create((set) => ({
  isOpen: false,
  mode: 'signup',
  open: (modeOrOptions) => {
    // Handle both string mode and options object
    const mode = typeof modeOrOptions === 'string' 
      ? modeOrOptions 
      : modeOrOptions?.mode || 'signup';
    set({ isOpen: true, mode });
  },
  close: () => set({ isOpen: false }),
}));