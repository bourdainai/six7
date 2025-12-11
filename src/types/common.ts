/**
 * Common TypeScript types used across the application
 */

import type { LucideIcon } from "lucide-react";

/**
 * Icon component type for Lucide icons
 */
export type IconComponent = LucideIcon;

/**
 * Generic record for JSON data
 */
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

/**
 * Error info from React error boundaries
 */
export interface ErrorBoundaryInfo {
  componentStack: string;
}

/**
 * User profile type (subset used in navigation)
 */
export interface UserProfile {
  id: string;
  email?: string;
  full_name?: string;
  username?: string;
  avatar_url?: string;
}

/**
 * Address validation result
 */
export interface ValidatedAddress {
  address_line_1: string;
  address_line_2?: string;
  city: string;
  postal_code: string;
  country: string;
  validated: boolean;
  suggestions?: ValidatedAddress[];
}

/**
 * Shipping details with optional metadata
 */
export interface ShippingDetails {
  carrier?: string;
  service?: string;
  tracking_number?: string;
  label_url?: string;
  estimated_delivery?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Order item with listing details
 */
export interface OrderItemWithListing {
  id: string;
  listing_id: string;
  quantity: number;
  price: number;
  listing?: {
    id: string;
    title: string;
    seller_price: number;
    weight?: number;
    status?: string;
    listing_images?: Array<{ image_url: string }>;
  };
}

/**
 * Bundle item type
 */
export interface BundleItem {
  id: string;
  bundle_id: string;
  listing_id: string;
  listing?: {
    id: string;
    title: string;
    seller_price: number;
    status?: string;
    listing_images?: Array<{ image_url: string }>;
  };
}

/**
 * Trade item in an offer
 */
export interface TradeItem {
  id: string;
  listing_id: string;
  listing?: {
    title: string;
    seller_price: number;
    listing_images?: Array<{ image_url: string }>;
  };
}

/**
 * Seller/buyer stats for leaderboards
 */
export interface UserStats {
  id: string;
  full_name?: string;
  username?: string;
  avatar_url?: string;
  count?: number;
  total?: number;
}

/**
 * Listing variant type
 */
export interface ListingVariant {
  id: string;
  listing_id: string;
  name: string;
  price: number;
  is_available: boolean;
  display_order?: number;
}

/**
 * Message attachment type
 */
export interface MessageAttachment {
  id: string;
  file_url: string;
  file_type: string;
  file_name?: string;
}

/**
 * Card in category attributes
 */
export interface CategoryCard {
  name: string;
  set?: string;
  number?: string;
  rarity?: string;
}
