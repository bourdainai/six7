import { supabase } from "@/integrations/supabase/client";

export const ACP_API_URL = '/functions/v1/acp';

export interface ACPProduct {
  id: string;
  title: string;
  description: string;
  condition: string;
  set_data: {
    code: string;
    number: string;
  } | null;
  rarity: string;
  grading: {
    service: string;
    score: number;
  } | null;
  price: number;
  currency: string;
  images: string[];
  video: string | null;
  seller_id: string;
  stock: number;
  trade_enabled: boolean;
  shipping_options: Array<{
    carrier: string;
    cost: number;
    estimated_days: number;
    region: string;
  }>;
  created_at: string;
}

export interface ACPProductDetail extends ACPProduct {
  seller: {
    id: string;
    name: string;
    trust_score: number;
    reputation: {
      trust_score: number;
      total_sales: number;
      positive_reviews: number;
    } | null;
  };
  comparable_sales: Array<{
    price: number;
    condition: string;
    date_sold: string;
    source: string;
  }>;
  updated_at: string;
}

export interface ACPCheckoutSession {
  session_id: string;
  total_amount: number;
  breakdown: {
    product_price: number;
    shipping_cost: number;
  };
  payment_method: string;
  wallet_balance: number;
  payment_intent_id: string | null;
  expires_at: string;
  reservation_expires_in_seconds: number;
}

export interface ACPPaymentResult {
  success: boolean;
  session_id: string;
  payment_confirmed: boolean;
  transactions: {
    wallet: string | null;
    stripe: string | null;
  };
}

export interface ACPOrderConfirmation {
  success: boolean;
  order_id: string;
  status: string;
  tracking_number: string | null;
  message: string;
}

export interface ACPError {
  error: string;
  details?: string;
  code?: string;
}

export class ACPClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${ACP_API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error: ACPError = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(error.error || `Request failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * List products with optional filters
   */
  async listProducts(params?: {
    limit?: number;
    offset?: number;
    condition?: string;
    set_code?: string;
    rarity?: string;
    min_price?: number;
    max_price?: number;
  }): Promise<{
    products: ACPProduct[];
    pagination: {
      limit: number;
      offset: number;
      total: number;
      has_more: boolean;
    };
    meta: {
      execution_time_ms: number;
      rate_limit: {
        limit: number;
        remaining: number;
        reset_at: string;
      };
    };
  }> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.offset) queryParams.set('offset', params.offset.toString());
    if (params?.condition) queryParams.set('condition', params.condition);
    if (params?.set_code) queryParams.set('set_code', params.set_code);
    if (params?.rarity) queryParams.set('rarity', params.rarity);
    if (params?.min_price) queryParams.set('min_price', params.min_price.toString());
    if (params?.max_price) queryParams.set('max_price', params.max_price.toString());

    return this.request(`/products?${queryParams.toString()}`);
  }

  /**
   * Get product details
   */
  async getProduct(productId: string): Promise<{
    product: ACPProductDetail;
    meta: {
      execution_time_ms: number;
    };
  }> {
    return this.request(`/product/${productId}`);
  }

  /**
   * Create checkout session
   */
  async createCheckout(params: {
    listing_id: string;
    quantity?: number;
    payment_method?: 'wallet' | 'stripe' | 'split';
    shipping_address: {
      name: string;
      line1: string;
      line2?: string;
      city: string;
      postal_code: string;
      country?: string;
    };
    trade_offer?: {
      cash_amount?: number;
      trade_items?: string[];
    };
  }): Promise<ACPCheckoutSession> {
    return this.request('/checkout', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Process payment
   */
  async processPayment(params: {
    session_id: string;
    payment_method_id?: string;
  }): Promise<ACPPaymentResult> {
    return this.request('/payment', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Confirm order
   */
  async confirmOrder(params: {
    session_id: string;
  }): Promise<ACPOrderConfirmation> {
    return this.request('/confirm', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Complete purchase flow (checkout -> payment -> confirm)
   */
  async purchase(params: {
    listing_id: string;
    payment_method: 'wallet' | 'stripe' | 'split';
    shipping_address: {
      name: string;
      line1: string;
      line2?: string;
      city: string;
      postal_code: string;
      country?: string;
    };
    payment_method_id?: string;
  }): Promise<ACPOrderConfirmation> {
    // Step 1: Create checkout
    const checkout = await this.createCheckout({
      listing_id: params.listing_id,
      payment_method: params.payment_method,
      shipping_address: params.shipping_address,
    });

    // Step 2: Process payment
    const payment = await this.processPayment({
      session_id: checkout.session_id,
      payment_method_id: params.payment_method_id,
    });

    if (!payment.success) {
      throw new Error('Payment failed');
    }

    // Step 3: Confirm order
    return this.confirmOrder({
      session_id: checkout.session_id,
    });
  }
}

/**
 * Create ACP client instance
 */
export function createACPClient(apiKey: string): ACPClient {
  return new ACPClient(apiKey);
}
