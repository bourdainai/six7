import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

// Get Supabase credentials from environment variables
// EXPO_PUBLIC_ prefix makes them available in the app
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase credentials not configured. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env');
}

// Custom storage adapter for Supabase Auth using SecureStore
const secureStorageAdapter = {
  getItem: async (key) => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error('Error reading from SecureStore:', error);
      return null;
    }
  },
  setItem: async (key, value) => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error('Error writing to SecureStore:', error);
    }
  },
  removeItem: async (key) => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('Error deleting from SecureStore:', error);
    }
  },
};

// Create Supabase client with SecureStore for auth persistence
export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder-key',
  {
    auth: {
      storage: secureStorageAdapter,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false, // Not needed for native apps
    },
  }
);

// Export a helper to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
};
