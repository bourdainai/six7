# 6Seven - MCP Implementation Guide

**Model Context Protocol (MCP) Integration for 6Seven**

This guide provides complete instructions for implementing and using the Model Context Protocol, enabling AI agents to programmatically interact with 6Seven through standardized tools.

---

## Overview

The Model Context Protocol (MCP) exposes 6Seven functionality as discrete tools that AI agents can discover and invoke. Unlike ACP (which focuses on purchasing), MCP provides broader capabilities:

- 🔍 Search and discovery
- 📝 Listing creation and management
- 💰 Price evaluation
- 🤝 Trade offer creation
- 💳 Wallet operations
- 🔍 Inventory management
- 🚨 Fake card detection

---

## MCP Architecture

### Server Information

**Base URL:** `https://api.sixseven.com/mcp`  
**Protocol:** JSON-RPC 2.0 over HTTP  
**Authentication:** API key (same as ACP)

### Available Tools

| Tool Name | Category | Description |
|-----------|----------|-------------|
| `search_listings` | Discovery | Search for trading cards |
| `get_listing` | Discovery | Get detailed listing info |
| `create_listing` | Selling | Create new listing |
| `update_listing` | Selling | Modify existing listing |
| `evaluate_price` | Pricing | Get AI price suggestion |
| `auto_list_from_photos` | Selling | Auto-create listing from photos |
| `submit_trade_offer` | Trading | Propose trade offer |
| `purchase_item` | Buying | Buy a listing |
| `get_wallet_balance` | Wallet | Check wallet balance |
| `deposit` | Wallet | Add funds to wallet |
| `withdraw` | Wallet | Withdraw funds |
| `ai_detect_fake` | Fraud | Scan for fake cards |
| `list_inventory` | Inventory | Get user's listings |

---

## Authentication

### API Key Setup

1. Log into 6Seven
2. Go to Settings → API Keys
3. Click "Generate MCP Key"
4. Copy the key

### Making Authenticated Requests

Include in HTTP headers:

```http
Authorization: Bearer YOUR_MCP_API_KEY
Content-Type: application/json
```

---

## Tool Specifications

### 1. search_listings

**Description:** Search for trading cards in the marketplace

**Parameters:**
```typescript
{
  query: string;           // Search term (card name, set, etc.)
  filters?: {
    condition?: string;    // "Near Mint", "Excellent", etc.
    rarity?: string;       // "Common", "Rare", "Ultra Rare"
    set?: string;          // Set code or name
    min_price?: number;
    max_price?: number;
  };
  limit?: number;          // Default: 20, Max: 100
}
```

**Returns:**
```json
{
  "results": [
    {
      "id": "uuid",
      "title": "Charizard VMAX",
      "price": 45.00,
      "condition": "Near Mint",
      "set": "Champion's Path",
      "rarity": "Ultra Rare",
      "seller": "cardcollector99",
      "images": ["url1"]
    }
  ],
  "total": 156,
  "execution_time_ms": 45
}
```

**Example Request:**
```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "search_listings",
  "params": {
    "query": "Charizard",
    "filters": {
      "condition": "Near Mint",
      "min_price": 20,
      "max_price": 100
    },
    "limit": 10
  }
}
```

---

### 2. get_listing

**Description:** Get detailed information about a specific listing

**Parameters:**
```typescript
{
  listing_id: string;  // UUID of the listing
}
```

**Returns:**
```json
{
  "listing": {
    "id": "uuid",
    "title": "Charizard VMAX - Champion's Path - Near Mint",
    "description": "...",
    "price": 45.00,
    "condition": "Near Mint",
    "set_data": {
      "name": "Champion's Path",
      "code": "swsh35",
      "number": "20/73"
    },
    "rarity": "Ultra Rare",
    "images": ["url1", "url2"],
    "video": "url",
    "seller": {
      "id": "uuid",
      "username": "cardcollector99",
      "rating": 4.9
    },
    "trade_enabled": true,
    "created_at": "2025-11-10T10:00:00Z"
  }
}
```

---

### 3. create_listing

**Description:** Create a new listing on 6Seven

**Parameters:**
```typescript
{
  card_data: {
    name: string;
    set: string;
    card_number?: string;
    rarity?: string;
    condition: string;
  };
  price: number;
  images: string[];      // Array of image URLs
  description?: string;
  trade_enabled?: boolean;
}
```

**Returns:**
```json
{
  "listing_id": "uuid",
  "status": "active",
  "url": "https://sixseven.com/listing/uuid",
  "created_at": "2025-11-19T14:30:00Z"
}
```

**Example:**
```json
{
  "jsonrpc": "2.0",
  "id": "2",
  "method": "create_listing",
  "params": {
    "card_data": {
      "name": "Pikachu VMAX",
      "set": "Vivid Voltage",
      "condition": "Near Mint",
      "rarity": "Ultra Rare"
    },
    "price": 35.00,
    "images": ["https://example.com/image1.jpg"],
    "description": "Perfect condition, pulled from pack",
    "trade_enabled": true
  }
}
```

---

### 4. update_listing

**Description:** Modify an existing listing

**Parameters:**
```typescript
{
  listing_id: string;
  updates: {
    price?: number;
    description?: string;
    condition?: string;
    trade_enabled?: boolean;
    status?: string;  // "active", "inactive", "sold"
  };
}
```

**Returns:**
```json
{
  "listing_id": "uuid",
  "updated_fields": ["price", "description"],
  "updated_at": "2025-11-19T14:35:00Z"
}
```

---

### 5. evaluate_price

**Description:** Get AI-suggested pricing for a card based on recent sales

**Parameters:**
```typescript
{
  card_data: {
    name: string;
    set: string;
    condition: string;
    card_number?: string;
  };
}
```

**Returns:**
```json
{
  "suggested_price": 45.00,
  "market_analysis": {
    "average_price": 44.20,
    "median_price": 45.00,
    "low_price": 38.00,
    "high_price": 52.00,
    "sample_size": 27
  },
  "recent_sales": [
    {
      "sold_date": "2025-11-15",
      "sold_price": 44.50,
      "condition": "Near Mint",
      "marketplace": "internal"
    }
  ],
  "trend": "+3.2%",
  "confidence": 0.87
}
```

**Example:**
```json
{
  "jsonrpc": "2.0",
  "id": "3",
  "method": "evaluate_price",
  "params": {
    "card_data": {
      "name": "Charizard VMAX",
      "set": "Champion's Path",
      "condition": "Near Mint"
    }
  }
}
```

---

### 6. auto_list_from_photos

**Description:** Create listing automatically from uploaded photos using AI

**Parameters:**
```typescript
{
  image_urls: string[];   // 1-12 image URLs
  seller_notes?: string;  // Optional notes to include
}
```

**Returns:**
```json
{
  "listing_draft": {
    "title": "Charizard VMAX - Champion's Path - Near Mint",
    "description": "AI-generated description...",
    "price": 45.00,
    "condition": "Near Mint",
    "card_detected": {
      "name": "Charizard VMAX",
      "set": "Champion's Path",
      "number": "20/73"
    }
  },
  "confidence_score": 0.94,
  "warnings": [],
  "suggestions": [
    "Consider adding a video for high-value card"
  ],
  "listing_id": "uuid"  // If auto-published
}
```

---

### 7. submit_trade_offer

**Description:** Propose a trade offer to a seller

**Parameters:**
```typescript
{
  target_listing_id: string;
  trade_items: Array<{
    listing_id: string;  // Your listing to trade
    valuation?: number;  // Optional manual valuation
  }>;
  cash_amount: number;   // Additional cash (can be 0)
  photos?: string[];     // Optional photos of trade items
}
```

**Returns:**
```json
{
  "trade_offer_id": "uuid",
  "status": "pending",
  "total_offer_value": 70.00,
  "breakdown": {
    "trade_items_value": 50.00,
    "cash": 20.00
  },
  "ai_fairness_score": 0.92,
  "ai_assessment": "Fair trade",
  "expires_at": "2025-11-26T14:30:00Z"
}
```

---

### 8. purchase_item

**Description:** Buy a listing

**Parameters:**
```typescript
{
  listing_id: string;
  payment_method: "wallet" | "stripe";
  shipping_address: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    postcode: string;
    country: string;
  };
}
```

**Returns:**
```json
{
  "order_id": "uuid",
  "status": "confirmed",
  "total_paid": 46.50,
  "tracking_number": "RM123456789GB",
  "estimated_delivery": "2025-11-21"
}
```

---

### 9. get_wallet_balance

**Description:** Check user's wallet balance

**Parameters:** None

**Returns:**
```json
{
  "available_balance": 125.50,
  "pending_balance": 45.00,
  "currency": "GBP",
  "lifetime_deposits": 500.00,
  "lifetime_withdrawals": 329.50
}
```

---

### 10. deposit

**Description:** Add money to wallet

**Parameters:**
```typescript
{
  amount: number;             // Min: 10, Max: 1000
  payment_method_id: string;  // Stripe payment method ID
}
```

**Returns:**
```json
{
  "transaction_id": "uuid",
  "amount": 50.00,
  "new_balance": 175.50,
  "status": "completed"
}
```

---

### 11. withdraw

**Description:** Withdraw money from wallet to bank account

**Parameters:**
```typescript
{
  amount: number;             // Min: 10
  bank_account_id: string;    // Linked bank account ID
}
```

**Returns:**
```json
{
  "withdrawal_id": "uuid",
  "amount": 100.00,
  "fee": 0.00,
  "net_amount": 100.00,
  "new_balance": 75.50,
  "status": "processing",
  "estimated_arrival": "2025-11-21"
}
```

---

### 12. ai_detect_fake

**Description:** Scan card images for authenticity

**Parameters:**
```typescript
{
  image_urls: string[];  // 1-12 image URLs of card
}
```

**Returns:**
```json
{
  "scan_id": "uuid",
  "authenticity_score": 0.92,
  "flagged": false,
  "issues": [],
  "confidence": "high",
  "recommendation": "Card appears authentic",
  "details": {
    "hologram_check": "pass",
    "print_quality": "pass",
    "corner_cut": "pass",
    "font_analysis": "pass"
  }
}
```

---

### 13. list_inventory

**Description:** Get user's current inventory (their listings)

**Parameters:**
```typescript
{
  status?: "active" | "inactive" | "sold";
  limit?: number;
}
```

**Returns:**
```json
{
  "inventory": [
    {
      "id": "uuid",
      "title": "Pikachu VMAX",
      "price": 35.00,
      "condition": "Near Mint",
      "status": "active",
      "views": 142,
      "likes": 8
    }
  ],
  "total": 23
}
```

---

## MCP Server Configuration

### mcp.json Schema

```json
{
  "name": "6seven-marketplace",
  "version": "1.0.0",
  "description": "AI-native trading card marketplace with cash + trade offers",
  "server": {
    "endpoint": "https://api.sixseven.com/mcp",
    "protocol": "http",
    "authentication": {
      "type": "bearer",
      "header": "Authorization"
    }
  },
  "tools": [
    {
      "name": "search_listings",
      "description": "Search for trading cards in the marketplace",
      "parameters": {
        "query": {
          "type": "string",
          "required": true,
          "description": "Search term"
        },
        "filters": {
          "type": "object",
          "required": false
        },
        "limit": {
          "type": "number",
          "required": false,
          "default": 20
        }
      }
    }
    // ... other tools
  ]
}
```

---

## Agent Integration Examples

### Claude Desktop Integration

Add to your Claude Desktop MCP config:

```json
{
  "mcpServers": {
    "sixseven": {
      "command": "node",
      "args": ["/path/to/sixseven-mcp-client.js"],
      "env": {
        "SIXSEVEN_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### Python MCP Client

```python
import requests

class SixSevenMCP:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.endpoint = "https://api.sixseven.com/mcp"
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    
    def call_tool(self, tool_name: str, params: dict):
        payload = {
            "jsonrpc": "2.0",
            "id": "1",
            "method": tool_name,
            "params": params
        }
        
        response = requests.post(
            self.endpoint,
            headers=self.headers,
            json=payload
        )
        
        return response.json()
    
    def search(self, query: str, filters=None):
        return self.call_tool("search_listings", {
            "query": query,
            "filters": filters or {}
        })
    
    def get_price(self, card_name: str, card_set: str, condition: str):
        return self.call_tool("evaluate_price", {
            "card_data": {
                "name": card_name,
                "set": card_set,
                "condition": condition
            }
        })
```

### Node.js MCP Client

```javascript
const axios = require('axios');

class SixSevenMCP {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.endpoint = 'https://api.sixseven.com/mcp';
  }
  
  async callTool(toolName, params) {
    const response = await axios.post(this.endpoint, {
      jsonrpc: '2.0',
      id: '1',
      method: toolName,
      params: params
    }, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    return response.data;
  }
  
  async search(query, filters = {}) {
    return this.callTool('search_listings', { query, filters });
  }
  
  async createListing(cardData, price, images) {
    return this.callTool('create_listing', {
      card_data: cardData,
      price: price,
      images: images
    });
  }
}

module.exports = SixSevenMCP;
```

---

## Use Cases

### 1. AI Shopping Assistant

Agent helps user find and purchase cards:

```
User: "Find me a Near Mint Charizard VMAX under £50"

Agent:
1. calls search_listings(query="Charizard VMAX", filters={condition: "Near Mint", max_price: 50})
2. Shows results to user
3. User selects one
4. calls get_listing(listing_id)
5. Shows details
6. User confirms purchase
7. calls purchase_item(listing_id, payment_method="wallet", shipping_address)
```

### 2. Automated Seller Bot

Agent manages inventory and pricing:

```
Bot workflow:
1. calls list_inventory() to get current listings
2. For each listing:
   - calls evaluate_price() to check current market
   - If price > 10% above market: calls update_listing() to lower price
   - If price < market: keep as is
3. Monitor for new trade offers
4. Accept favorable offers automatically (fairness_score > 0.9)
```

### 3. Price Tracker

Agent monitors card values:

```
Daily cron job:
1. For each card in watchlist:
   - calls evaluate_price()
   - Store in database
   - Calculate trend
2. If price drops > 10%:
   - Notify user
   - Optionally auto-purchase
```

### 4. Bulk Listing Tool

Agent creates many listings from photos:

```
User uploads 50 card photos

Agent:
1. For each photo:
   - calls auto_list_from_photos([image_url])
   - Reviews confidence score
   - If score > 0.9: auto-publish
   - If score < 0.9: flag for manual review
2. Reports summary to user
```

---

## Error Handling

### JSON-RPC Error Format

```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "error": {
    "code": -32600,
    "message": "Invalid request",
    "data": {
      "details": "Missing required parameter: query"
    }
  }
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| -32600 | Invalid Request |
| -32601 | Method not found |
| -32602 | Invalid params |
| -32603 | Internal error |
| -32000 | Rate limit exceeded |
| -32001 | Authentication failed |
| -32002 | Insufficient permissions |

---

## Rate Limiting

**Limits:**
- 1,000 requests per hour per API key
- 10,000 requests per day per API key

**Checking Limits:**

Response headers include:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 1637337600
```

---

## Testing

### Test Environment

**Endpoint:** `https://sandbox-api.sixseven.com/mcp`

**Test API Key:** Request from support

### Test Tools

All tools available in sandbox with test data.

### Example Test

```python
# Test search
mcp = SixSevenMCP("test_api_key")
results = mcp.search("test-card-1")
assert len(results["results"]) > 0

# Test price evaluation
price = mcp.get_price("test-card-1", "Test Set", "Near Mint")
assert price["suggested_price"] > 0
```

---

## Best Practices

### 1. Cache Responses

Don't call `evaluate_price` repeatedly for the same card. Cache for at least 1 hour.

### 2. Batch Operations

Use `search_listings` with higher limit instead of multiple single requests.

### 3. Handle Failures Gracefully

Always check for errors and provide fallback behavior.

### 4. Respect Rate Limits

Implement exponential backoff when rate limited.

### 5. Validate Input

Check parameters before making requests to avoid errors.

---

## Monitoring

### Logging

All MCP calls are logged in `mcp_logs` table:

- Tool name
- User/Agent ID
- Parameters
- Response
- Execution time
- Status

### Analytics Dashboard

View your MCP usage at: `https://sixseven.com/settings/mcp/analytics`

Shows:
- Calls per day
- Most used tools
- Error rates
- Average response time

---

## Support

**MCP Implementation Questions:**

- Email: mcp-support@sixseven.com
- Discord: #mcp-developers
- Docs: https://docs.sixseven.com/mcp

---

## Changelog

### v1.0 (2025-11-19)
- Initial MCP implementation
- 13 tools available
- JSON-RPC 2.0 protocol
- Rate limiting

---

**Document Status:** Complete  
**Last Updated:** 2025-11-19  
**MCP Version:** 1.0
