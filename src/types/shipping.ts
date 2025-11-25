import type { Json } from "@/integrations/supabase/types";

/**
 * Shipping and parcel related type definitions
 */

export interface ParcelData {
  id: string;
  carrier: string | null;
  status: 'pending' | 'in_transit' | 'delivered' | 'delivery_failed' | string;
  shipping_cost: number;
  created_at: string;
  updated_at: string;
  tracking_number?: string | null;
  [key: string]: unknown; // Allow for additional fields
}

export interface OrderData {
  id: string;
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled' | string;
  buyer_id: string;
  seller_id: string;
  total_amount: number;
  shipping_cost: number | null;
  shipping_address: Json;
  carrier: string | null;
  tracking_number: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
  [key: string]: unknown; // Allow for additional fields
}

export interface ShippingAddress {
  name: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state?: string;
  postal_code: string;
  country: string;
  phone?: string;
}

export interface BulkLabelResult {
  successCount: number;
  errorCount: number;
  totalProcessed: number;
  results: Array<{
    orderId: string;
    success: boolean;
    error?: string;
    labelUrl?: string;
  }>;
  errors?: Array<{
    orderId: string;
    error: string;
  }>;
}

export interface ShippingPreset {
  id: string;
  name: string;
  default_carrier: string;
  seller_id: string;
  default_service_point_id: string;
  default_shipping_method_id: string;
  default_package_type: string;
  settings: Json;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}
