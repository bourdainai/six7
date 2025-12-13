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

// Normalize listing rows for app consumption (keeps backward compatibility)
const normalizeListing = (listing) => {
  const isBundle =
    (typeof listing?.bundle_type === 'string' && listing.bundle_type !== 'none') ||
    Boolean(listing?.has_variants);

  return {
    ...listing,
    // Some screens still reference `listing.price`; the DB uses `seller_price`.
    price: listing?.seller_price ?? listing?.price ?? 0,
    // Some screens still reference `listing.is_bundle`; the DB uses bundle fields.
    is_bundle: listing?.is_bundle ?? isBundle,
  };
};

/**
 * Fetch listings from the database with optional filters
 * @param {Object} options - Query options
 * @param {number} options.limit - Maximum number of listings to return
 * @param {Object} options.filters - Filter criteria (category, condition, etc.)
 * @param {string} options.orderBy - Column to order by
 * @param {boolean} options.ascending - Sort direction
 * @returns {Promise<Array>} Array of listings
 */
export const fetchListings = async ({
  limit = 50,
  filters = {},
  orderBy = 'created_at',
  ascending = false
} = {}) => {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured, returning empty listings');
    return [];
  }

  try {
    let query = supabase
      .from('listings')
      .select(`
        id,
        title,
        description,
        seller_price,
        condition,
        status,
        created_at,
        views,
        bundle_type,
        has_variants,
        bundle_price,
        remaining_bundle_price,
        seller_id,
        seller:profiles!listings_seller_id_fkey(id, full_name, avatar_url),
        listing_images(id, image_url, display_order)
      `)
      .eq('status', 'active');

    // Apply filters
    if (filters.category && filters.category !== 'all') {
      query = query.eq('category', filters.category);
    }
    if (filters.condition) {
      query = query.eq('condition', filters.condition);
    }
    if (filters.minPrice) {
      query = query.gte('seller_price', filters.minPrice);
    }
    if (filters.maxPrice) {
      query = query.lte('seller_price', filters.maxPrice);
    }

    // Apply ordering - map 'price' to 'seller_price' for backward compatibility
    const validOrderColumns = ['created_at', 'views', 'seller_price', 'title', 'saves'];
    const mappedOrderBy = orderBy === 'price' ? 'seller_price' : orderBy;
    const finalOrderBy = validOrderColumns.includes(mappedOrderBy) ? mappedOrderBy : 'created_at';
    query = query.order(finalOrderBy, { ascending });

    // Apply limit
    query = query.limit(limit);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching listings:', error);
      throw error;
    }

    return (data || []).map(normalizeListing);
  } catch (error) {
    console.error('fetchListings error:', error);
    throw error;
  }
};

/**
 * Search listings by query string
 * @param {string} query - Search query
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Array>} Array of matching listings
 */
export const searchListings = async (query, limit = 50) => {
  if (!isSupabaseConfigured() || !query) {
    return [];
  }

  try {
    // Use text search on title and description
    const { data, error } = await supabase
      .from('listings')
      .select(`
        id,
        title,
        description,
        seller_price,
        condition,
        status,
        created_at,
        views,
        bundle_type,
        has_variants,
        bundle_price,
        remaining_bundle_price,
        seller_id,
        seller:profiles!listings_seller_id_fkey(id, full_name, avatar_url),
        listing_images(id, image_url, display_order)
      `)
      .eq('status', 'active')
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error searching listings:', error);
      throw error;
    }

    return (data || []).map(normalizeListing);
  } catch (error) {
    console.error('searchListings error:', error);
    throw error;
  }
};
