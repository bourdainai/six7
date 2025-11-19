# 6Seven - ACP Implementation Guide

**Agentic Commerce Protocol (ACP) Implementation for 6Seven**

This guide provides complete instructions for implementing the Agentic Commerce Protocol, enabling AI agents to autonomously purchase items from 6Seven.

---

## Overview

The Agentic Commerce Protocol (ACP) is a standardized API that allows AI agents (like ChatGPT, Claude, etc.) to:
- Browse products programmatically
- Create checkout sessions
- Process payments
- Confirm orders

All without requiring human interaction.

---

## ACP Endpoints

6Seven implements 5 core ACP endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/acp/products` | GET | List all available products |
| `/acp/product/:id` | GET | Get single product details |
| `/acp/checkout` | POST | Create checkout session |
| `/acp/payment` | POST | Capture payment |
| `/acp/confirm` | POST | Finalize order |

---

## Authentication

All ACP requests require authentication via API key.

### Obtaining an API Key

1. Log into 6Seven
2. Navigate to Settings → API Keys
3. Click "Generate ACP Key"
4. Copy and securely store the key

### Using the API Key

Include in request headers:

```http
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

---

## Endpoint Specifications

### 1. GET /acp/products

**Purpose:** Retrieve catalog of available products

**Query Parameters:**
```typescript
{
  limit?: number;        // Default: 20, Max: 100
  offset?: number;       // Default: 0
  filters?: {
    condition?: string;  // "Near Mint", "Excellent", etc.
    set_code?: string;   // Pokemon set code
    rarity?: string;     // "Common", "Rare", etc.
    min_price?: number;  // Minimum price in GBP
    max_price?: number;  // Maximum price in GBP
  }
}
```

**Response:**
```json
{
  "products": [
    {
      "id": "uuid",
      "title": "Charizard VMAX - Champion's Path - Near Mint",
      "description": "...",
      "condition": "Near Mint",
      "set_data": {
        "name": "Champion's Path",
        "code": "swsh35",
        "number": "20/73"
      },
      "rarity": "Ultra Rare",
      "price": 45.00,
      "images": ["url1", "url2"],
      "video": "url",
      "seller_id": "uuid",
      "stock": 1,
      "shipping_options": [
        {
          "carrier": "Royal Mail",
          "service": "First Class",
          "cost": 1.50,
          "estimated_days": "1-2"
        }
      ],
      "wallet_eligible": true,
      "trade_enabled": true
    }
  ],
  "pagination": {
    "total": 1523,
    "limit": 20,
    "offset": 0
  }
}
```

**Example Request:**
```bash
curl -X GET "https://api.sixseven.com/acp/products?limit=10&filters[condition]=Near%20Mint" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

### 2. GET /acp/product/:id

**Purpose:** Get detailed information about a single product

**URL Parameters:**
- `id` (string, required): Product UUID

**Response:**
```json
{
  "id": "uuid",
  "title": "...",
  "description": "...",
  "condition": "Near Mint",
  "set_data": { ... },
  "rarity": "Ultra Rare",
  "price": 45.00,
  "images": [...],
  "video": "url",
  "seller_id": "uuid",
  "seller": {
    "username": "cardcollector99",
    "rating": 4.9,
    "total_sales": 342,
    "response_time": "< 1 hour"
  },
  "stock": 1,
  "shipping_options": [...],
  "wallet_eligible": true,
  "trade_enabled": true,
  "pricing_history": [
    { "date": "2025-11-01", "price": 42.00 },
    { "date": "2025-11-10", "price": 45.00 }
  ],
  "comparable_sales": [
    {
      "sold_date": "2025-11-15",
      "sold_price": 44.50,
      "condition": "Near Mint",
      "marketplace": "internal"
    }
  ]
}
```

**Example Request:**
```bash
curl -X GET "https://api.sixseven.com/acp/product/123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

### 3. POST /acp/checkout

**Purpose:** Create a provisional checkout session

**Request Body:**
```json
{
  "product_id": "uuid",
  "quantity": 1,
  "payment_method": "wallet|stripe",
  "shipping_address": {
    "name": "John Smith",
    "line1": "123 High Street",
    "line2": "Apt 4B",
    "city": "London",
    "postcode": "SW1A 1AA",
    "country": "GB"
  },
  "trade_offer": {
    "items": [
      {
        "listing_id": "uuid",
        "valuation": 25.00
      }
    ],
    "cash_amount": 20.00
  }
}
```

**Response:**
```json
{
  "session_id": "uuid",
  "total_amount": 46.50,
  "breakdown": {
    "product_price": 45.00,
    "shipping_cost": 1.50,
    "tax": 0.00
  },
  "wallet_deduction": 46.50,
  "stripe_payment_required": 0.00,
  "stripe_client_secret": null,
  "reservation_expires": "2025-11-19T15:30:00Z",
  "risk_score": 0.12,
  "requires_review": false
}
```

**Process:**
1. Product availability validated
2. Wallet balance checked
3. Stripe PaymentIntent created (if needed)
4. Risk/fraud checks run
5. Inventory reserved for 15 minutes
6. Total calculated including shipping

**Example Request:**
```bash
curl -X POST "https://api.sixseven.com/acp/checkout" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "123e4567-e89b-12d3-a456-426614174000",
    "quantity": 1,
    "payment_method": "wallet",
    "shipping_address": {
      "name": "John Smith",
      "line1": "123 High Street",
      "city": "London",
      "postcode": "SW1A 1AA",
      "country": "GB"
    }
  }'
```

---

### 4. POST /acp/payment

**Purpose:** Capture final payment

**Request Body:**
```json
{
  "session_id": "uuid",
  "payment_confirmation": {
    "stripe_payment_method_id": "pm_xxx" // Only if Stripe required
  }
}
```

**Response:**
```json
{
  "payment_id": "uuid",
  "status": "completed",
  "amount_charged": 46.50,
  "payment_breakdown": {
    "wallet_used": 46.50,
    "stripe_charged": 0.00
  },
  "transaction_id": "txn_123456",
  "timestamp": "2025-11-19T14:15:30Z"
}
```

**Error Response:**
```json
{
  "payment_id": "uuid",
  "status": "failed",
  "error": "Insufficient wallet balance",
  "error_code": "WALLET_INSUFFICIENT_FUNDS"
}
```

**Example Request:**
```bash
curl -X POST "https://api.sixseven.com/acp/payment" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "123e4567-e89b-12d3-a456-426614174000",
    "payment_confirmation": {}
  }'
```

---

### 5. POST /acp/confirm

**Purpose:** Finalize the order

**Request Body:**
```json
{
  "session_id": "uuid",
  "payment_id": "uuid"
}
```

**Response:**
```json
{
  "order_id": "uuid",
  "status": "confirmed",
  "tracking_number": "RM123456789GB",
  "tracking_url": "https://www.royalmail.com/track/RM123456789GB",
  "estimated_delivery": "2025-11-21",
  "seller": {
    "username": "cardcollector99",
    "message": "Thanks for your purchase! Will ship today."
  },
  "created_at": "2025-11-19T14:15:30Z"
}
```

**Process:**
1. Order record created in database
2. Shipping label generated
3. Notifications sent to buyer and seller
4. Inventory updated
5. Wallet settlements processed
6. Transaction history recorded

**Example Request:**
```bash
curl -X POST "https://api.sixseven.com/acp/confirm" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "123e4567-e89b-12d3-a456-426614174000",
    "payment_id": "456e7890-f12b-34d5-a678-426614174001"
  }'
```

---

## Complete Purchase Flow

### Step-by-Step Example

**Step 1: Search for Products**
```bash
GET /acp/products?filters[condition]=Near%20Mint&limit=10
```

**Step 2: Get Product Details**
```bash
GET /acp/product/{product_id}
```

**Step 3: Create Checkout Session**
```bash
POST /acp/checkout
{
  "product_id": "{product_id}",
  "payment_method": "wallet",
  "shipping_address": { ... }
}
```

**Step 4: Capture Payment**
```bash
POST /acp/payment
{
  "session_id": "{session_id}",
  "payment_confirmation": {}
}
```

**Step 5: Confirm Order**
```bash
POST /acp/confirm
{
  "session_id": "{session_id}",
  "payment_id": "{payment_id}"
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad Request (invalid parameters) |
| 401 | Unauthorized (invalid API key) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found (product doesn't exist) |
| 409 | Conflict (product no longer available) |
| 429 | Too Many Requests (rate limit exceeded) |
| 500 | Internal Server Error |

### Error Response Format

```json
{
  "error": {
    "code": "PRODUCT_NOT_AVAILABLE",
    "message": "This product is no longer available",
    "details": {
      "product_id": "123e4567-e89b-12d3-a456-426614174000",
      "status": "sold"
    }
  }
}
```

### Common Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| `INVALID_API_KEY` | API key is invalid or revoked | Generate new API key |
| `PRODUCT_NOT_AVAILABLE` | Product sold or removed | Search for alternative |
| `WALLET_INSUFFICIENT_FUNDS` | Not enough wallet balance | Add funds to wallet or use Stripe |
| `PAYMENT_FAILED` | Stripe payment declined | Try different payment method |
| `RESERVATION_EXPIRED` | Checkout session timed out | Start new checkout |
| `RATE_LIMIT_EXCEEDED` | Too many requests | Wait before retrying |

---

## Rate Limiting

**Limits:**
- 1,000 requests per hour per API key
- 10,000 requests per day per API key

**Rate Limit Headers:**
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 1637337600
```

**Exceeding Limits:**
- HTTP 429 response
- Retry after time provided in `Retry-After` header

---

## Wallet Integration

### Checking Wallet Balance

Use the MCP tool `get_wallet_balance` or query directly:

```bash
GET /api/wallet/balance
Authorization: Bearer YOUR_API_KEY
```

Response:
```json
{
  "available_balance": 125.50,
  "pending_balance": 45.00,
  "currency": "GBP"
}
```

### Adding Funds

```bash
POST /api/wallet/deposit
{
  "amount": 50.00,
  "payment_method_id": "pm_xxx"
}
```

### Using Wallet in ACP

Set `payment_method: "wallet"` in checkout request. System will:
1. Deduct available amount from wallet
2. Charge remainder to Stripe (if any)
3. Split transaction properly

---

## Testing

### Sandbox Environment

**Base URL:** `https://sandbox-api.sixseven.com`

**Test API Key:** Contact support for sandbox key

**Test Products:** Sandbox contains 100+ test listings

### Test Scenarios

**1. Successful Purchase (Wallet)**
```bash
# Product: test-product-wallet-1
# Price: £10.00
# Wallet Balance: £50.00
# Expected: Success, wallet deducted £10.00
```

**2. Split Payment (Wallet + Stripe)**
```bash
# Product: test-product-split-1
# Price: £50.00
# Wallet Balance: £30.00
# Expected: £30 from wallet, £20 from Stripe
```

**3. Insufficient Funds**
```bash
# Product: test-product-expensive-1
# Price: £100.00
# Wallet Balance: £10.00
# Stripe: Declined
# Expected: Payment failure
```

**4. Product Unavailable**
```bash
# Product: test-product-sold-1
# Expected: 409 Conflict
```

---

## Security

### Best Practices

1. **Store API Keys Securely**
   - Never commit to version control
   - Use environment variables
   - Rotate keys regularly

2. **Validate Responses**
   - Check HTTP status codes
   - Verify signature (if provided)
   - Handle errors gracefully

3. **Implement Retries**
   - Use exponential backoff
   - Respect rate limits
   - Don't retry 4xx errors

4. **Monitor Usage**
   - Track API calls
   - Set up alerts for errors
   - Review logs regularly

### API Key Management

**Revoke Key:**
```bash
POST /api/keys/revoke
{
  "key_id": "key_xxx"
}
```

**Regenerate Key:**
```bash
POST /api/keys/regenerate
{
  "key_id": "key_xxx"
}
```

---

## Agent Implementation Examples

### ChatGPT Plugin Example

```json
{
  "schema_version": "v1",
  "name_for_human": "6Seven Trading Cards",
  "name_for_model": "sixseven",
  "description_for_human": "Buy Pokémon trading cards",
  "description_for_model": "Search and purchase Pokémon trading cards...",
  "auth": {
    "type": "user_http",
    "authorization_type": "bearer"
  },
  "api": {
    "type": "openapi",
    "url": "https://api.sixseven.com/acp/openapi.json"
  }
}
```

### Python Client Example

```python
import requests

class SixSevenACP:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.sixseven.com"
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    
    def search_products(self, filters=None, limit=20):
        params = {"limit": limit}
        if filters:
            for key, value in filters.items():
                params[f"filters[{key}]"] = value
        
        response = requests.get(
            f"{self.base_url}/acp/products",
            headers=self.headers,
            params=params
        )
        return response.json()
    
    def purchase(self, product_id: str, shipping_address: dict):
        # Create checkout
        checkout_response = requests.post(
            f"{self.base_url}/acp/checkout",
            headers=self.headers,
            json={
                "product_id": product_id,
                "payment_method": "wallet",
                "shipping_address": shipping_address
            }
        )
        checkout = checkout_response.json()
        
        # Capture payment
        payment_response = requests.post(
            f"{self.base_url}/acp/payment",
            headers=self.headers,
            json={"session_id": checkout["session_id"]}
        )
        payment = payment_response.json()
        
        # Confirm order
        confirm_response = requests.post(
            f"{self.base_url}/acp/confirm",
            headers=self.headers,
            json={
                "session_id": checkout["session_id"],
                "payment_id": payment["payment_id"]
            }
        )
        
        return confirm_response.json()
```

---

## Support

**Questions about ACP implementation?**

- Email: acp-support@sixseven.com
- Discord: #acp-developers channel
- Docs: https://docs.sixseven.com/acp

---

## Changelog

### v1.0 (2025-11-19)
- Initial ACP implementation
- 5 core endpoints
- Wallet integration
- Rate limiting

---

**Document Status:** Complete  
**Last Updated:** 2025-11-19  
**API Version:** 1.0
