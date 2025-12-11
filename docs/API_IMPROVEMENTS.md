# API Integrations & Feature Improvements

## Overview

This document outlines recommended API integrations and feature improvements for 6Seven.

## Current Integrations (154 Edge Functions)

| Category | Provider | Status |
|----------|----------|--------|
| Card Data | Pokemon TCG API, TCGdex | Active |
| Payments | Stripe Connect, Wallet | Active |
| Shipping | SendCloud | Active |
| AI/ML | Lovable AI (Gemini), OpenAI Embeddings | Active |
| Fraud | Image forensics, duplicate detection | Active |
| Real-time | Supabase Realtime | Active |

---

## Phase 1: High-Impact Integrations (Weeks 1-4)

### 1.1 TCGPlayer API - Real-Time Pricing

**Purpose:** Live market pricing instead of cached data

**Implementation:**
```typescript
// Edge function: supabase/functions/sync-tcgplayer-prices/index.ts
interface TCGPlayerPrice {
  productId: number;
  prices: {
    normal: { low: number; mid: number; high: number; market: number };
    holofoil: { low: number; mid: number; high: number; market: number };
  };
}

// Update pokemon_card_attributes with live prices
// Run as daily cron job
```

**API Details:**
- Endpoint: `https://api.tcgplayer.com/v1/products/search`
- Rate limit: 30 requests/second
- Requires API key application

**Impact:** Real-time competitive pricing, better seller guidance

### 1.2 Apple Pay & Google Pay

**Purpose:** Mobile checkout optimization (30% conversion lift expected)

**Implementation:**
```typescript
// Already supported by Stripe - needs UI integration
import { PaymentRequestButtonElement } from '@stripe/react-stripe-js';

const paymentRequest = stripe.paymentRequest({
  country: 'GB',
  currency: 'gbp',
  total: { label: 'Card Purchase', amount: totalPrice * 100 },
  requestPayerName: true,
  requestShipping: true,
});
```

**Files to update:**
- `src/pages/Checkout.tsx`
- `supabase/functions/create-checkout/index.ts`

### 1.3 Push Notifications (FCM)

**Purpose:** Real-time alerts for offers, messages, price drops

**Implementation:**
```typescript
// Capacitor integration
import { PushNotifications } from '@capacitor/push-notifications';

// Database: Add to profiles table
ALTER TABLE profiles ADD COLUMN fcm_token VARCHAR(255);
ALTER TABLE profiles ADD COLUMN push_notifications_enabled BOOLEAN DEFAULT TRUE;

// Edge function: supabase/functions/send-push-notification/index.ts
```

**Notification types:**
- New offer received
- Message received
- Price drop on saved item
- Order shipped/delivered

### 1.4 AI Card Condition Grading

**Purpose:** Automated condition assessment from photos

**Implementation:**
```typescript
// Edge function: supabase/functions/ai-grade-condition/index.ts
interface ConditionGrade {
  grade: 'mint' | 'near_mint' | 'excellent' | 'good' | 'played' | 'damaged';
  score: number; // 1-10
  factors: {
    surfaceQuality: number;
    centering: number;
    corners: number;
    edges: number;
  };
  estimatedPSA: number;
  confidence: number;
}
```

**Benefits:**
- 40% faster listing creation
- Reduced condition disputes
- Better buyer trust

---

## Phase 2: Medium-Impact Features (Weeks 5-8)

### 2.1 CardMarket API - European Pricing

**Purpose:** European market data for UK/EU sellers

**API:** OAuth2 authentication required
```typescript
// Endpoint: https://api.cardmarket.com/v2/
// Edge function: supabase/functions/fetch-cardmarket-prices/index.ts
```

### 2.2 Klarna Integration

**Purpose:** "Buy Now, Pay Later" for high-value cards (>£100)

**Implementation:**
```typescript
// Edge function: supabase/functions/klarna-create-session/index.ts
// Endpoint: https://api.klarna.com/payments/v1/sessions
```

**Use case:** Cards £200-1000, 3-payment option

### 2.3 Price Prediction Model

**Purpose:** Smart pricing guidance for sellers

**Features:**
- 7-day and 30-day price predictions
- Trend direction (up/down/stable)
- Confidence scores
- Factor analysis (set age, rarity, demand)

**Data sources:**
- Internal sales history
- TCGPlayer trends
- CardMarket data
- eBay sold listings

### 2.4 Royal Mail API

**Purpose:** UK cost optimization, carrier choice

**Implementation:**
```typescript
// Edge function: supabase/functions/royal-mail-create-label/index.ts
// Direct API for better rates than SendCloud aggregation
```

---

## Phase 3: Advanced Features (Weeks 9-12)

### 3.1 Comprehensive Fraud Detection

**Multi-factor scoring:**
```typescript
interface FraudAssessment {
  overallRiskScore: number; // 0-100
  flags: Array<{
    type: 'stock_photo' | 'counterfeit_risk' | 'unusual_pricing' | 'seller_pattern';
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
  requiresReview: boolean;
}
```

**Factors analyzed:**
1. Image forensics (existing)
2. Seller behavior patterns (new)
3. Market price anomalies (new)
4. Card database validation (new)

### 3.2 Auction System

**Purpose:** Premium sales for rare cards

**Database schema:**
```sql
CREATE TABLE auctions (
  id UUID PRIMARY KEY,
  listing_id UUID,
  start_price DECIMAL(10,2),
  end_time TIMESTAMP,
  status VARCHAR(50)
);

CREATE TABLE bids (
  id UUID PRIMARY KEY,
  auction_id UUID,
  bidder_id UUID,
  amount DECIMAL(10,2),
  created_at TIMESTAMP
);
```

**Real-time:** Supabase Realtime for live bidding

### 3.3 Market Analytics Dashboard

**Platform-wide intelligence:**
- Market health indicators
- Price trends by set/rarity
- Demand scoring
- Seller performance benchmarks

---

## Database Additions Required

```sql
-- Price sources tracking
CREATE TABLE card_price_sources (
  id UUID PRIMARY KEY,
  card_id VARCHAR(255),
  source VARCHAR(50), -- 'tcgplayer', 'cardmarket', 'ebay'
  price DECIMAL(10,2),
  last_updated TIMESTAMP
);

-- Fraud assessment history
CREATE TABLE fraud_assessments (
  id UUID PRIMARY KEY,
  listing_id UUID,
  risk_score INTEGER,
  flags JSONB,
  created_at TIMESTAMP
);

-- Price predictions
CREATE TABLE price_predictions (
  id UUID PRIMARY KEY,
  card_id VARCHAR(255),
  predicted_7d DECIMAL(10,2),
  predicted_30d DECIMAL(10,2),
  confidence DECIMAL(3,2),
  created_at TIMESTAMP
);

-- Push notification tokens
ALTER TABLE profiles ADD COLUMN fcm_token VARCHAR(255);
ALTER TABLE profiles ADD COLUMN push_notifications_enabled BOOLEAN DEFAULT TRUE;
```

---

## Environment Variables Required

```bash
# Card Data APIs
TCGPLAYER_API_KEY=
CARDMARKET_CONSUMER_KEY=
CARDMARKET_CONSUMER_SECRET=
EBAY_API_KEY=

# Payment
KLARNA_API_KEY=

# Shipping
ROYAL_MAIL_API_KEY=

# AI/ML
GOOGLE_VISION_API_KEY=

# Push Notifications
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
```

---

## Success Metrics

| Metric | Current | Target | Phase |
|--------|---------|--------|-------|
| Checkout conversion | ~2.5% | 3.5% | 1 |
| Mobile checkout | ~35% | 50% | 1 |
| Avg listing time | 45 min | 15 min | 2 |
| Dispute rate | 3.2% | 1.5% | 2 |
| Repeat seller rate | 35% | 60% | 3 |

---

## Implementation Priority

### Immediate (This Sprint)
1. Apple Pay / Google Pay UI integration
2. Push notification infrastructure

### Next Sprint
1. TCGPlayer API integration
2. AI condition grading

### Backlog
1. Klarna integration
2. Price prediction model
3. Auction system
4. Market analytics dashboard
