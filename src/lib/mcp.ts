export const MCP_API_URL = '/functions/v1/mcp';

export interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

export interface MCPResponse<T = unknown> {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface MCPServerInfo {
  name: string;
  version: string;
  protocol: string;
  capabilities: {
    tools: number;
    authentication: boolean;
    rate_limiting: boolean;
    ai_visibility_control: boolean;
  };
}

export class MCPClient {
  private apiKey: string;
  private requestId: number = 0;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private generateId(): string {
    this.requestId += 1;
    return `mcp_${Date.now()}_${this.requestId}`;
  }

  private async call<T>(
    method: string,
    params?: Record<string, unknown>
  ): Promise<T> {
    const id = this.generateId();
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    // Determine endpoint from method name
    const methodToEndpoint: Record<string, string> = {
      'search_listings': '/search',
      'get_listing': '/get-listing',
      'create_listing': '/create-listing',
      'update_listing': '/update-listing',
      'evaluate_price': '/evaluate-price',
      'auto_list_from_photos': '/auto-list',
      'submit_trade_offer': '/trade-offer',
      'purchase_item': '/buy',
      'get_wallet_balance': '/wallet',
      'deposit': '/wallet',
      'withdraw': '/wallet',
      'ai_detect_fake': '/detect-fake',
      'list_inventory': '/list-inventory',
    };

    const endpoint = methodToEndpoint[method] || '/server';
    const url = `${MCP_API_URL}${endpoint}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MCP request failed: ${response.status} ${errorText}`);
    }

    const mcpResponse: MCPResponse<T> = await response.json();

    if (mcpResponse.error) {
      throw new Error(`MCP error [${mcpResponse.error.code}]: ${mcpResponse.error.message}`);
    }

    if (!mcpResponse.result) {
      throw new Error('MCP response missing result');
    }

    return mcpResponse.result;
  }

  /**
   * Discover available tools
   */
  async listTools(): Promise<{
    tools: MCPTool[];
    server: MCPServerInfo;
    capabilities: Record<string, unknown>;
  }> {
    return this.call('tools/list', {});
  }

  /**
   * Get server information
   */
  async getServerInfo(): Promise<MCPServerInfo> {
    return this.call('server/info', {});
  }

  /**
   * Search listings
   */
  async searchListings(params: {
    query: string;
    filters?: {
      condition?: string;
      rarity?: string;
      set?: string;
      min_price?: number;
      max_price?: number;
    };
    limit?: number;
  }): Promise<{
    results: Array<{
      id: string;
      title: string;
      price: number;
      condition: string;
      set: string;
      rarity: string;
      seller: string;
      images: string[];
    }>;
    total: number;
    execution_time_ms: number;
  }> {
    return this.call('search_listings', params);
  }

  /**
   * Get listing details
   */
  async getListing(params: {
    listing_id: string;
  }): Promise<{
    listing: {
      id: string;
      title: string;
      description: string;
      price: number;
      condition: string;
      set: string;
      rarity: string;
      grading: {
        service: string;
        score: number;
      } | null;
      images: string[];
      video: string | null;
      seller: {
        id: string;
        name: string;
        trust_score: number;
      };
      trade_enabled: boolean;
      shipping: {
        cost: number;
        free: boolean;
      };
      created_at: string;
      updated_at: string;
    };
    execution_time_ms: number;
  }> {
    return this.call('get_listing', params);
  }

  /**
   * Create listing
   */
  async createListing(params: {
    card_data: {
      name: string;
      set: string;
      condition: string;
      rarity?: string;
      card_number?: string;
    };
    price: number;
    description?: string;
    images?: string[];
    trade_enabled?: boolean;
  }): Promise<{
    listing_id: string;
    listing_url: string;
    status: string;
    ai_answer_engines_enabled: boolean;
    note: string;
    execution_time_ms: number;
  }> {
    return this.call('create_listing', params);
  }

  /**
   * Update listing
   */
  async updateListing(params: {
    listing_id: string;
    updates: {
      price?: number;
      description?: string;
      condition?: string;
      trade_enabled?: boolean;
      status?: 'active' | 'inactive' | 'sold';
      ai_answer_engines_enabled?: boolean;
    };
  }): Promise<{
    listing_id: string;
    updated_fields: string[];
    updated_at: string;
    execution_time_ms: number;
  }> {
    return this.call('update_listing', params);
  }

  /**
   * Evaluate price
   */
  async evaluatePrice(params: {
    card_data: {
      name: string;
      set: string;
      condition: string;
      card_number?: string;
    };
  }): Promise<{
    suggested_price: number;
    currency: string;
    market_analysis: {
      average_price: number;
      median_price: number;
      low_price: number;
      high_price: number;
      sample_size: number;
    };
    recent_sales: Array<{
      sold_date: string;
      sold_price: number;
      condition: string;
      marketplace: string;
    }>;
    trend: string | null;
    confidence: number;
    execution_time_ms: number;
  }> {
    return this.call('evaluate_price', params);
  }

  /**
   * Auto-list from photos
   */
  async autoListFromPhotos(params: {
    image_urls: string[];
    seller_notes?: string;
  }): Promise<{
    listing_draft: {
      title: string;
      description: string;
      price: number;
      condition: string;
      card_detected: Record<string, unknown>;
    };
    confidence_score: number;
    warnings: string[];
    suggestions: string[];
    listing_id: string | null;
    note: string;
    execution_time_ms: number;
  }> {
    return this.call('auto_list_from_photos', params);
  }

  /**
   * Submit trade offer
   */
  async submitTradeOffer(params: {
    target_listing_id: string;
    trade_items?: Array<{
      listing_id: string;
      valuation?: number;
    }>;
    cash_amount?: number;
    photos?: string[];
  }): Promise<{
    trade_offer_id: string;
    status: string;
    total_offer_value: number;
    breakdown: {
      trade_items_value: number;
      cash: number;
    };
    ai_fairness_score: number;
    ai_assessment: string;
    expires_at: string;
    execution_time_ms: number;
  }> {
    return this.call('submit_trade_offer', params);
  }

  /**
   * Purchase item
   */
  async purchaseItem(params: {
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
  }): Promise<{
    order_id: string;
    status: string;
    total_amount: number;
    tracking_number: string | null;
    message: string;
    execution_time_ms: number;
  }> {
    return this.call('purchase_item', params);
  }

  /**
   * Get wallet balance
   */
  async getWalletBalance(): Promise<{
    balance: number;
    pending_balance: number;
    currency: string;
    execution_time_ms: number;
  }> {
    return this.call('get_wallet_balance', { operation: 'get_balance' });
  }

  /**
   * Deposit to wallet
   */
  async deposit(params: {
    amount: number;
    currency?: string;
  }): Promise<{
    operation: string;
    amount: number;
    new_balance: number;
    currency: string;
    execution_time_ms: number;
  }> {
    return this.call('deposit', { operation: 'deposit', ...params });
  }

  /**
   * Withdraw from wallet
   */
  async withdraw(params: {
    amount: number;
  }): Promise<{
    operation: string;
    amount: number;
    new_balance: number;
    currency: string;
    execution_time_ms: number;
  }> {
    return this.call('withdraw', { operation: 'withdraw', ...params });
  }

  /**
   * Detect fake cards
   */
  async detectFake(params: {
    image_urls: string[];
  }): Promise<{
    authentic: boolean;
    authenticity_score: number;
    confidence: number;
    details: Record<string, unknown>;
    recommendations: string[];
    execution_time_ms: number;
  }> {
    return this.call('ai_detect_fake', params);
  }

  /**
   * List inventory
   */
  async listInventory(params?: {
    status?: 'active' | 'inactive' | 'sold' | 'all';
    limit?: number;
  }): Promise<{
    items: Array<{
      id: string;
      title: string;
      price: number;
      status: string;
      views: number;
      saves: number;
      ai_answer_engines_enabled: boolean;
      images: string[];
      created_at: string;
      updated_at: string;
    }>;
    total: number;
    execution_time_ms: number;
  }> {
    return this.call('list_inventory', params || {});
  }
}

/**
 * Create MCP client instance
 */
export function createMCPClient(apiKey: string): MCPClient {
  return new MCPClient(apiKey);
}
