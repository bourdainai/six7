// Direct Supabase queries - replaces API route calls
import { supabase, isSupabaseConfigured } from './supabaseClient';

// Fetch listings directly from Supabase
export async function fetchListings({
  limit = 20,
  orderBy = "created_at",
  ascending = false,
  filters = {},
} = {}) {
  try {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please set environment variables.');
    }

    console.log("[fetchListings] Fetching from Supabase...");

    let query = supabase
      .from('listings')
      .select(`
        *,
        seller:profiles!seller_id(id, full_name, avatar_url, trust_score),
        listing_images(image_url, display_order)
      `)
      .eq('status', 'active')
      .order(orderBy, { ascending })
      .limit(limit);

    // Apply filters
    if (filters.category) {
      query = query.eq('category', filters.category);
    }
    if (filters.minPrice) {
      query = query.gte('seller_price', filters.minPrice);
    }
    if (filters.maxPrice) {
      query = query.lte('seller_price', filters.maxPrice);
    }
    if (filters.condition) {
      query = query.eq('condition', filters.condition);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[fetchListings] Supabase error:", error);
      throw new Error(`Failed to fetch listings: ${error.message}`);
    }

    console.log("[fetchListings] Success! Got", data?.length || 0, "listings");
    
    // Transform data to match expected format
    return (data || []).map(listing => ({
      ...listing,
      listing_images: listing.listing_images || [],
    }));
  } catch (error) {
    console.error("[fetchListings] Error:", error);
    throw error;
  }
}

// Search listings using Supabase text search
export async function searchListings(query) {
  try {
    if (!isSupabaseConfigured()) {
      return [];
    }

    if (!query || query.trim().length === 0) {
      return await fetchListings({ limit: 50 });
    }

    const { data, error } = await supabase
      .from('listings')
      .select(`
        *,
        seller:profiles!seller_id(id, full_name, avatar_url, trust_score),
        listing_images(image_url, display_order)
      `)
      .eq('status', 'active')
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .limit(50);

    if (error) {
      console.error("Error searching listings:", error);
      return [];
    }

    return (data || []).map(listing => ({
      ...listing,
      listing_images: listing.listing_images || [],
    }));
  } catch (error) {
    console.error("Error searching listings:", error);
    return [];
  }
}

// Get user profile from Supabase
export async function getUserProfile(userId) {
  try {
    if (!isSupabaseConfigured() || !userId) {
      return null;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error fetching profile:", error);
    return null;
  }
}

// Get wallet balance from Supabase
export async function getWalletBalance(userId) {
  try {
    if (!isSupabaseConfigured() || !userId) {
      return 0;
    }

    const { data, error } = await supabase
      .from('wallet_accounts')
      .select('balance')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error("Error fetching wallet:", error);
      return 0;
    }

    return Number(data?.balance || 0);
  } catch (error) {
    console.error("Error fetching wallet:", error);
    return 0;
  }
}

// Get single listing by ID
export async function getListingById(listingId) {
  try {
    if (!isSupabaseConfigured() || !listingId) {
      throw new Error('Listing ID is required');
    }

    const { data, error } = await supabase
      .from('listings')
      .select(`
        *,
        seller:profiles!seller_id(id, full_name, avatar_url, trust_score),
        listing_images(image_url, display_order),
        listing_variants(*)
      `)
      .eq('id', listingId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch listing: ${error.message}`);
    }

    return {
      ...data,
      listing_images: data.listing_images || [],
      listing_variants: data.listing_variants || [],
    };
  } catch (error) {
    console.error("Error fetching listing:", error);
    throw error;
  }
}

// Export supabase client for direct use
export { supabase, isSupabaseConfigured };
