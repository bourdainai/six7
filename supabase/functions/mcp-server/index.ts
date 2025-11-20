import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateApiKey, corsHeaders } from "../_shared/auth-middleware.ts";

const TOOLS = [
  {
    name: "search_listings",
    description: "Search for trading cards in the marketplace",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search term (card name, set, etc.)" },
        filters: {
          type: "object",
          properties: {
            condition: { type: "string" },
            rarity: { type: "string" },
            set: { type: "string" },
            min_price: { type: "number" },
            max_price: { type: "number" },
          },
        },
        limit: { type: "number", default: 20, maximum: 100 },
      },
      required: ["query"],
    },
  },
  {
    name: "get_listing",
    description: "Get detailed information about a specific listing",
    inputSchema: {
      type: "object",
      properties: {
        listing_id: { type: "string", format: "uuid" },
      },
      required: ["listing_id"],
    },
  },
  {
    name: "create_listing",
    description: "Create a new listing for a trading card",
    inputSchema: {
      type: "object",
      properties: {
        card_data: {
          type: "object",
          properties: {
            name: { type: "string" },
            set: { type: "string" },
            condition: { type: "string" },
            rarity: { type: "string" },
            card_number: { type: "string" },
          },
          required: ["name", "set", "condition"],
        },
        price: { type: "number", minimum: 0 },
        description: { type: "string" },
        images: { type: "array", items: { type: "string" } },
        trade_enabled: { type: "boolean", default: true },
      },
      required: ["card_data", "price"],
    },
  },
  {
    name: "update_listing",
    description: "Modify an existing listing",
    inputSchema: {
      type: "object",
      properties: {
        listing_id: { type: "string", format: "uuid" },
        updates: {
          type: "object",
          properties: {
            price: { type: "number" },
            description: { type: "string" },
            condition: { type: "string" },
            trade_enabled: { type: "boolean" },
            status: { type: "string", enum: ["active", "inactive", "sold"] },
            ai_answer_engines_enabled: { type: "boolean" },
          },
        },
      },
      required: ["listing_id", "updates"],
    },
  },
  {
    name: "evaluate_price",
    description: "Get AI-suggested pricing for a card based on recent sales",
    inputSchema: {
      type: "object",
      properties: {
        card_data: {
          type: "object",
          properties: {
            name: { type: "string" },
            set: { type: "string" },
            condition: { type: "string" },
            card_number: { type: "string" },
          },
          required: ["name", "set", "condition"],
        },
      },
      required: ["card_data"],
    },
  },
  {
    name: "auto_list_from_photos",
    description: "Create listing automatically from uploaded photos using AI",
    inputSchema: {
      type: "object",
      properties: {
        image_urls: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 12 },
        seller_notes: { type: "string" },
      },
      required: ["image_urls"],
    },
  },
  {
    name: "submit_trade_offer",
    description: "Propose a trade offer to a seller",
    inputSchema: {
      type: "object",
      properties: {
        target_listing_id: { type: "string", format: "uuid" },
        trade_items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              listing_id: { type: "string", format: "uuid" },
              valuation: { type: "number" },
            },
          },
        },
        cash_amount: { type: "number", default: 0, minimum: 0 },
        photos: { type: "array", items: { type: "string" } },
      },
      required: ["target_listing_id"],
    },
  },
  {
    name: "purchase_item",
    description: "Buy a listing",
    inputSchema: {
      type: "object",
      properties: {
        listing_id: { type: "string", format: "uuid" },
        payment_method: { type: "string", enum: ["wallet", "stripe", "split"] },
        shipping_address: {
          type: "object",
          properties: {
            name: { type: "string" },
            line1: { type: "string" },
            line2: { type: "string" },
            city: { type: "string" },
            postal_code: { type: "string" },
            country: { type: "string", default: "GB" },
          },
          required: ["name", "line1", "city", "postal_code"],
        },
      },
      required: ["listing_id", "payment_method", "shipping_address"],
    },
  },
  {
    name: "get_wallet_balance",
    description: "Check wallet balance",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "deposit",
    description: "Add funds to wallet",
    inputSchema: {
      type: "object",
      properties: {
        amount: { type: "number", minimum: 1 },
        currency: { type: "string", default: "GBP" },
      },
      required: ["amount"],
    },
  },
  {
    name: "withdraw",
    description: "Withdraw funds from wallet",
    inputSchema: {
      type: "object",
      properties: {
        amount: { type: "number", minimum: 1 },
      },
      required: ["amount"],
    },
  },
  {
    name: "ai_detect_fake",
    description: "Scan for fake cards using AI",
    inputSchema: {
      type: "object",
      properties: {
        image_urls: { type: "array", items: { type: "string" }, minItems: 1 },
      },
      required: ["image_urls"],
    },
  },
  {
    name: "list_inventory",
    description: "Get user's listings",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["active", "inactive", "sold", "all"], default: "all" },
        limit: { type: "number", default: 50, maximum: 100 },
      },
    },
  },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate API key (optional for server info, but recommended)
    const authResult = await validateApiKey(req, []);
    const isAuthenticated = authResult.success;

    const body = await req.json().catch(() => ({}));
    const { jsonrpc, id, method } = body;

    // Handle tool discovery
    if (method === 'tools/list' || method === 'list_tools' || !method) {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: id || null,
          result: {
            tools: TOOLS.map(tool => ({
              name: tool.name,
              description: tool.description,
              inputSchema: tool.inputSchema,
            })),
            server: {
              name: "6Seven MCP Server",
              version: "1.0.0",
              protocol: "json-rpc-2.0",
            },
            capabilities: {
              authentication: isAuthenticated,
              rate_limiting: true,
              ai_visibility_control: true,
            },
          },
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Handle server info
    if (method === 'server/info' || method === 'info') {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: id || null,
          result: {
            name: "6Seven MCP Server",
            version: "1.0.0",
            protocol: "json-rpc-2.0",
            capabilities: {
              tools: TOOLS.length,
              authentication: isAuthenticated,
              rate_limiting: true,
              ai_visibility_control: true,
            },
          },
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Unknown method
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id: id || null,
        error: {
          code: -32601,
          message: 'Method not found',
          data: `Available methods: tools/list, server/info, or any tool name from the tools list`,
        },
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32603,
          message: 'Internal error',
          data: error instanceof Error ? error.message : 'Unknown error',
        },
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
