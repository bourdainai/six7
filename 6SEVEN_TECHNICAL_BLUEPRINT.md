# 6Seven - Technical Implementation Blueprint

This document defines the execution layer for 6Seven. Use this to generate files, functions, schemas, and workflow automation.

---

## 1. Project Structure

### Frontend (React + TypeScript + Vite)

```
src/
├── components/
│   ├── acp/                      # NEW: ACP components
│   │   ├── ACPProductList.tsx
│   │   ├── ACPCheckout.tsx
│   │   └── ACPOrderStatus.tsx
│   ├── mcp/                      # NEW: MCP components
│   │   ├── MCPToolTester.tsx
│   │   └── MCPAgentDashboard.tsx
│   ├── listings/
│   │   ├── ListingCard.tsx       # EXISTS - adapt for cards
│   │   ├── QuickListModal.tsx    # NEW: AI auto-listing
│   │   ├── BundleCreator.tsx     # NEW: Bundle builder
│   │   └── VideoListingPlayer.tsx # NEW: Video support
│   ├── trade/                    # NEW: Trade system
│   │   ├── TradeOfferModal.tsx
│   │   ├── TradeItemSelector.tsx
│   │   ├── TradeFairnessScore.tsx
│   │   └── TradeOfferCard.tsx
│   ├── wallet/                   # NEW: Wallet system
│   │   ├── WalletBalance.tsx
│   │   ├── WalletDeposit.tsx
│   │   ├── WalletWithdraw.tsx
│   │   └── WalletTransactions.tsx
│   ├── feed/                     # NEW: TikTok-style feed
│   │   ├── VerticalFeed.tsx
│   │   ├── FeedCard.tsx
│   │   └── FeedControls.tsx
│   ├── shipping/                 # NEW: Shipping
│   │   ├── ShippingLabelViewer.tsx
│   │   └── TrackingTimeline.tsx
│   ├── admin/                    # NEW: Admin dashboard
│   │   ├── FakeCardReviewQueue.tsx
│   │   ├── DisputeManager.tsx
│   │   ├── RefundProcessor.tsx
│   │   └── AdminOrderView.tsx
│   └── ui/                       # EXISTS - Radix components
├── pages/
│   ├── ListingDetail.tsx         # EXISTS - adapt
│   ├── Feed.tsx                  # NEW: Vertical feed page
│   ├── Wallet.tsx                # NEW: Wallet management
│   ├── TradeOffers.tsx           # NEW: Trade inbox
│   ├── AdminDashboard.tsx        # NEW: Admin panel
│   └── MCPDocs.tsx               # NEW: MCP documentation
├── hooks/
│   ├── useWallet.ts              # NEW: Wallet operations
│   ├── useTradeOffers.ts         # NEW: Trade management
│   ├── useACPCheckout.ts         # NEW: ACP flow
│   ├── usePricingComps.ts        # NEW: Pricing data
│   └── useShipping.ts            # NEW: Shipping operations
├── integrations/
│   └── supabase/
│       ├── client.ts             # EXISTS
│       ├── types.ts              # EXISTS - extend
│       └── queries.ts            # EXISTS - extend
├── lib/
│   ├── acp.ts                    # NEW: ACP utilities
│   ├── mcp.ts                    # NEW: MCP utilities
│   ├── pokemon-tcg.ts            # NEW: TCG API client
│   ├── pricing.ts                # NEW: Pricing logic
│   └── shipping.ts               # NEW: Shipping logic
└── main.tsx                      # EXISTS
```

### Backend (Supabase)

```
supabase/
├── functions/
│   ├── acp/                      # NEW: ACP Protocol
│   │   ├── acp-products.ts
│   │   ├── acp-product.ts
│   │   ├── acp-checkout.ts
│   │   ├── acp-payment.ts
│   │   └── acp-confirm.ts
│   ├── mcp/                      # NEW: MCP Protocol
│   │   ├── mcp-server.ts
│   │   ├── mcp-search.ts
│   │   ├── mcp-create-listing.ts
│   │   ├── mcp-evaluate-price.ts
│   │   ├── mcp-auto-list.ts
│   │   ├── mcp-trade-offer.ts
│   │   ├── mcp-buy.ts
│   │   ├── mcp-wallet.ts
│   │   ├── mcp-detect-fake.ts
│   │   └── mcp-list-inventory.ts
│   ├── trade/                    # NEW: Trade engine
│   │   ├── trade-create.ts
│   │   ├── trade-counter.ts
│   │   ├── trade-accept.ts
│   │   ├── trade-reject.ts
│   │   ├── trade-valuation.ts
│   │   └── trade-fairness.ts
│   ├── wallet/                   # NEW: Wallet system
│   │   ├── wallet-deposit.ts
│   │   ├── wallet-withdraw.ts
│   │   ├── wallet-transfer.ts
│   │   └── wallet-settlement.ts
│   ├── listing/                  # NEW: AI listing tools
│   │   ├── ai-generate-description.ts
│   │   ├── ai-analyse-images.ts
│   │   ├── ai-price-suggestion.ts
│   │   └── ai-auto-list-from-photos.ts
│   ├── media/                    # NEW: Media processing
│   │   ├── media-upload.ts
│   │   └── media-process-video.ts
│   ├── shipping/                 # NEW: Shipping automation
│   │   ├── shipping-create-label.ts
│   │   ├── shipping-tracking-webhook.ts
│   │   └── shipping-calc-rates.ts
│   ├── admin/                    # NEW: Customer service
│   │   ├── admin-refund.ts
│   │   ├── admin-flag.ts
│   │   ├── admin-fake-review.ts
│   │   ├── admin-trade-review.ts
│   │   └── admin-dispute-summary.ts
│   ├── pokemon/                  # NEW: TCG integration
│   │   └── sync-tcg-data.ts
│   └── pricing/                  # NEW: Pricing comps
│       └── ingest-comp-data.ts
├── migrations/
│   └── [timestamps]_*.sql        # Database migrations
└── config.toml                   # Supabase config
```

---

## 2. Database Schema

### Core Tables

#### Listings Table (Extend Existing)

```sql
-- Add trading card specific columns
ALTER TABLE listings ADD COLUMN IF NOT EXISTS card_id VARCHAR(255);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS set_code VARCHAR(50);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS card_number VARCHAR(50);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS rarity VARCHAR(100);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS condition VARCHAR(50);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS grading_service VARCHAR(50);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS grading_score DECIMAL(3,1);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS trade_enabled BOOLEAN DEFAULT true;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS attributes JSONB;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS comps JSONB;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS shipping_methods JSONB;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS bundle_id UUID REFERENCES bundles(id);

CREATE INDEX idx_listings_card_id ON listings(card_id);
CREATE INDEX idx_listings_set_code ON listings(set_code);
CREATE INDEX idx_listings_condition ON listings(condition);
```

### New Tables

#### Trade Offers

```sql
CREATE TABLE trade_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id UUID REFERENCES profiles(id) NOT NULL,
  seller_id UUID REFERENCES profiles(id) NOT NULL,
  target_listing_id UUID REFERENCES listings(id) NOT NULL,
  cash_amount DECIMAL(10,2) DEFAULT 0.00,
  trade_items JSONB NOT NULL, -- [{listing_id, valuation, photos}]
  trade_item_valuations JSONB,
  photos TEXT[],
  ai_valuation_summary TEXT,
  ai_fairness_score DECIMAL(3,2), -- 0.00 to 1.00
  status VARCHAR(50) DEFAULT 'pending', -- pending, accepted, rejected, countered, expired
  expiry_date TIMESTAMP,
  counter_offer_id UUID REFERENCES trade_offers(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_trade_offers_buyer ON trade_offers(buyer_id);
CREATE INDEX idx_trade_offers_seller ON trade_offers(seller_id);
CREATE INDEX idx_trade_offers_status ON trade_offers(status);
```

#### Wallet System

```sql
CREATE TABLE wallet_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) UNIQUE NOT NULL,
  balance DECIMAL(10,2) DEFAULT 0.00 CHECK (balance >= 0),
  pending_balance DECIMAL(10,2) DEFAULT 0.00 CHECK (pending_balance >= 0),
  lifetime_deposits DECIMAL(10,2) DEFAULT 0.00,
  lifetime_withdrawals DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID REFERENCES wallet_accounts(id) NOT NULL,
  type VARCHAR(50) NOT NULL, -- deposit, withdrawal, purchase, sale, transfer_in, transfer_out
  amount DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  related_user_id UUID REFERENCES profiles(id),
  related_order_id UUID REFERENCES orders(id),
  stripe_transaction_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'completed',
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_wallet_transactions_wallet ON wallet_transactions(wallet_id, created_at DESC);
CREATE INDEX idx_wallet_transactions_type ON wallet_transactions(type);

CREATE TABLE wallet_deposits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID REFERENCES wallet_accounts(id) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  stripe_payment_intent_id VARCHAR(255) UNIQUE,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE wallet_withdrawals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID REFERENCES wallet_accounts(id) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  bank_account_id VARCHAR(255),
  stripe_transfer_id VARCHAR(255) UNIQUE,
  status VARCHAR(50) DEFAULT 'pending',
  initiated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE TABLE wallet_settlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_wallet_id UUID REFERENCES wallet_accounts(id) NOT NULL,
  order_id UUID REFERENCES orders(id) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  fee_amount DECIMAL(10,2) NOT NULL,
  net_amount DECIMAL(10,2) NOT NULL,
  hold_until TIMESTAMP NOT NULL,
  released_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Media Support

```sql
CREATE TABLE listing_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID REFERENCES listings(id) NOT NULL,
  type VARCHAR(20) NOT NULL, -- 'image' or 'video'
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  position INTEGER DEFAULT 0,
  ai_enhanced BOOLEAN DEFAULT false,
  quality_score DECIMAL(3,2),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_listing_media_listing ON listing_media(listing_id, position);
```

#### Shipping

```sql
CREATE TABLE shipping_labels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) NOT NULL,
  carrier VARCHAR(50) NOT NULL,
  service_level VARCHAR(100),
  tracking_number VARCHAR(255) UNIQUE,
  label_url TEXT,
  cost DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE shipping_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label_id UUID REFERENCES shipping_labels(id) NOT NULL,
  status VARCHAR(100) NOT NULL,
  location VARCHAR(255),
  timestamp TIMESTAMP NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_shipping_events_label ON shipping_events(label_id, timestamp DESC);

CREATE TABLE carrier_contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  carrier VARCHAR(50) UNIQUE NOT NULL,
  api_key TEXT, -- Encrypted
  api_secret TEXT, -- Encrypted
  account_number VARCHAR(255),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE shipping_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  carrier VARCHAR(50) NOT NULL,
  service_level VARCHAR(100) NOT NULL,
  weight_min DECIMAL(10,2),
  weight_max DECIMAL(10,2),
  base_cost DECIMAL(10,2) NOT NULL,
  per_kg_cost DECIMAL(10,2),
  last_updated TIMESTAMP DEFAULT NOW()
);
```

#### Pokémon TCG Data

```sql
CREATE TABLE pokemon_card_attributes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  set_name VARCHAR(255),
  set_code VARCHAR(50),
  number VARCHAR(50),
  rarity VARCHAR(100),
  supertype VARCHAR(100),
  subtypes JSONB,
  hp INTEGER,
  artist VARCHAR(255),
  release_date DATE,
  legalities JSONB,
  images JSONB,
  market_price DECIMAL(10,2),
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_pokemon_card_name ON pokemon_card_attributes(name);
CREATE INDEX idx_pokemon_card_set ON pokemon_card_attributes(set_code);
```

#### Pricing Comps

```sql
CREATE TABLE pricing_comps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id VARCHAR(255) NOT NULL,
  source VARCHAR(50) NOT NULL, -- tcgplayer, ebay, internal
  condition VARCHAR(50),
  sold_price DECIMAL(10,2) NOT NULL,
  sold_date DATE NOT NULL,
  marketplace VARCHAR(100),
  url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_pricing_comps_card ON pricing_comps(card_id, condition, sold_date DESC);

CREATE TABLE market_prices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id VARCHAR(255) NOT NULL,
  condition VARCHAR(50) NOT NULL,
  average_price DECIMAL(10,2),
  median_price DECIMAL(10,2),
  low_price DECIMAL(10,2),
  high_price DECIMAL(10,2),
  sample_size INTEGER,
  last_updated TIMESTAMP DEFAULT NOW(),
  UNIQUE(card_id, condition)
);
```

#### Fake Card Detection

```sql
CREATE TABLE fake_card_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID REFERENCES listings(id) NOT NULL,
  scan_id UUID UNIQUE,
  ai_confidence_score DECIMAL(5,2),
  flagged BOOLEAN DEFAULT false,
  issues_detected JSONB,
  video_required BOOLEAN DEFAULT false,
  video_url TEXT,
  manual_review_status VARCHAR(50), -- pending, approved, rejected
  manual_review_notes TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_fake_card_listing ON fake_card_results(listing_id);
CREATE INDEX idx_fake_card_review_status ON fake_card_results(manual_review_status);
```

#### MCP Logs

```sql
CREATE TABLE mcp_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tool VARCHAR(100) NOT NULL,
  user_id UUID REFERENCES profiles(id),
  agent_id VARCHAR(255),
  payload JSONB,
  response JSONB,
  status VARCHAR(50),
  duration_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_mcp_logs_tool ON mcp_logs(tool, created_at DESC);
CREATE INDEX idx_mcp_logs_user ON mcp_logs(user_id);
```

#### Bundles

```sql
CREATE TABLE bundles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID REFERENCES profiles(id) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  base_price DECIMAL(10,2) NOT NULL,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  final_price DECIMAL(10,2) NOT NULL,
  items JSONB NOT NULL, -- [{listing_id, quantity}]
  extras JSONB, -- [{extra_id, quantity}]
  total_cards INTEGER NOT NULL,
  total_weight DECIMAL(10,2), -- grams
  shipping_cost DECIMAL(10,2),
  images TEXT[],
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_bundles_seller ON bundles(seller_id);
CREATE INDEX idx_bundles_status ON bundles(status);

CREATE TABLE bundle_extras (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL, -- sleeve, toploader, binder, box
  price DECIMAL(10,2) NOT NULL,
  weight DECIMAL(10,2), -- grams
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### ACP Sessions

```sql
CREATE TABLE acp_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id VARCHAR(255) NOT NULL,
  product_id UUID REFERENCES listings(id),
  payment_method VARCHAR(50),
  total_amount DECIMAL(10,2),
  wallet_deduction DECIMAL(10,2),
  stripe_payment_required DECIMAL(10,2),
  risk_score DECIMAL(3,2),
  reservation_expires TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_acp_sessions_agent ON acp_sessions(agent_id);
```

---

## 3. Edge Functions Implementation

### ACP Functions

#### acp-products.ts

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from '@supabase/supabase-js';

serve(async (req) => {
  const { limit = 20, offset = 0, filters = {} } = await req.json();
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  let query = supabase
    .from('listings')
    .select(`
      *,
      profiles:seller_id (username, avatar_url, rating)
    `)
    .eq('status', 'active')
    .range(offset, offset + limit - 1);
  
  // Apply filters
  if (filters.condition) query = query.eq('condition', filters.condition);
  if (filters.set_code) query = query.eq('set_code', filters.set_code);
  if (filters.min_price) query = query.gte('price', filters.min_price);
  if (filters.max_price) query = query.lte('price', filters.max_price);
  
  const { data: products, error, count } = await query;
  
  if (error) throw error;
  
  return new Response(JSON.stringify({
    products: products.map(serializeProduct),
    pagination: { total: count, limit, offset }
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
});

function serializeProduct(listing: any) {
  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    condition: listing.condition,
    set_data: {
      name: listing.set_name,
      code: listing.set_code,
      number: listing.card_number
    },
    rarity: listing.rarity,
    price: listing.price,
    images: listing.images || [],
    video: listing.video_url,
    seller_id: listing.seller_id,
    stock: 1,
    shipping_options: listing.shipping_methods || [],
    wallet_eligible: true,
    trade_enabled: listing.trade_enabled
  };
}
```

#### acp-checkout.ts

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from '@supabase/supabase-js';
import Stripe from 'https://esm.sh/stripe@14.5.0';

serve(async (req) => {
  const { product_id, payment_method, shipping_address, trade_offer } = await req.json();
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2023-10-16',
  });
  
  // 1. Validate product availability
  const { data: listing } = await supabase
    .from('listings')
    .select('*')
    .eq('id', product_id)
    .eq('status', 'active')
    .single();
  
  if (!listing) throw new Error('Product not available');
  
  // 2. Check wallet balance
  let wallet_deduction = 0;
  if (payment_method === 'wallet') {
    const { data: wallet } = await supabase
      .from('wallet_accounts')
      .select('balance')
      .eq('user_id', req.headers.get('user-id'))
      .single();
    
    wallet_deduction = Math.min(wallet.balance, listing.price);
  }
  
  // 3. Create Stripe payment intent for remainder
  const stripe_payment_required = listing.price - wallet_deduction;
  let payment_intent_id = null;
  
  if (stripe_payment_required > 0) {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(stripe_payment_required * 100),
      currency: 'gbp',
      metadata: { listing_id: product_id }
    });
    payment_intent_id = paymentIntent.id;
  }
  
  // 4. Run risk checks
  const risk_score = await calculateRiskScore(req.headers.get('user-id'));
  
  // 5. Reserve inventory
  await supabase
    .from('listings')
    .update({ status: 'reserved' })
    .eq('id', product_id);
  
  // 6. Create session
  const { data: session } = await supabase
    .from('acp_sessions')
    .insert({
      agent_id: req.headers.get('agent-id'),
      product_id,
      payment_method,
      total_amount: listing.price,
      wallet_deduction,
      stripe_payment_required,
      risk_score,
      reservation_expires: new Date(Date.now() + 15 * 60 * 1000) // 15 min
    })
    .select()
    .single();
  
  return new Response(JSON.stringify({
    session_id: session.id,
    total_amount: listing.price,
    wallet_deduction,
    stripe_payment_required,
    stripe_client_secret: payment_intent_id,
    reservation_expires: session.reservation_expires,
    risk_score,
    requires_review: risk_score > 0.7
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
});

async function calculateRiskScore(user_id: string): Promise<number> {
  // Implement risk scoring logic
  return 0.1;
}
```

### Trade Functions

#### trade-create.ts

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from '@supabase/supabase-js';

serve(async (req) => {
  const { 
    target_listing_id, 
    trade_items, 
    cash_amount, 
    photos 
  } = await req.json();
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  const buyer_id = req.headers.get('user-id');
  
  // Get target listing and seller
  const { data: listing } = await supabase
    .from('listings')
    .select('*, seller_id')
    .eq('id', target_listing_id)
    .single();
  
  // Get AI valuation for trade items
  const valuations = await Promise.all(
    trade_items.map(item => getAIValuation(item.listing_id))
  );
  
  // Calculate fairness score
  const total_offer_value = valuations.reduce((sum, v) => sum + v, 0) + cash_amount;
  const fairness_score = total_offer_value / listing.price;
  
  // Generate AI summary
  const summary = await generateTradeSummary({
    buyer_id,
    seller_id: listing.seller_id,
    target_listing: listing,
    trade_items,
    valuations,
    cash_amount,
    fairness_score
  });
  
  // Create trade offer
  const { data: offer } = await supabase
    .from('trade_offers')
    .insert({
      buyer_id,
      seller_id: listing.seller_id,
      target_listing_id,
      cash_amount,
      trade_items,
      trade_item_valuations: valuations,
      photos,
      ai_valuation_summary: summary,
      ai_fairness_score: fairness_score,
      expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    })
    .select()
    .single();
  
  // Notify seller
  await supabase
    .from('notifications')
    .insert({
      user_id: listing.seller_id,
      type: 'trade_offer_received',
      title: 'New Trade Offer',
      message: `You have a new trade offer for ${listing.title}`,
      link: `/trade-offers/${offer.id}`
    });
  
  return new Response(JSON.stringify(offer), {
    headers: { 'Content-Type': 'application/json' }
  });
});

async function getAIValuation(listing_id: string): Promise<number> {
  // Call AI pricing service
  return 0;
}

async function generateTradeSummary(data: any): Promise<string> {
  // Call AI to generate natural language summary
  return "";
}
```

### Wallet Functions

#### wallet-deposit.ts

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from '@supabase/supabase-js';
import Stripe from 'https://esm.sh/stripe@14.5.0';

serve(async (req) => {
  const { amount, payment_method_id } = await req.json();
  const user_id = req.headers.get('user-id');
  
  if (amount < 10 || amount > 1000) {
    throw new Error('Amount must be between £10 and £1000');
  }
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2023-10-16',
  });
  
  // Create payment intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: 'gbp',
    payment_method: payment_method_id,
    confirm: true,
    metadata: { type: 'wallet_deposit', user_id }
  });
  
  if (paymentIntent.status === 'succeeded') {
    // Get or create wallet
    let { data: wallet } = await supabase
      .from('wallet_accounts')
      .select('*')
      .eq('user_id', user_id)
      .single();
    
    if (!wallet) {
      const { data: newWallet } = await supabase
        .from('wallet_accounts')
        .insert({ user_id, balance: 0 })
        .select()
        .single();
      wallet = newWallet;
    }
    
    // Update balance
    const new_balance = wallet.balance + amount;
    await supabase
      .from('wallet_accounts')
      .update({ 
        balance: new_balance,
        lifetime_deposits: wallet.lifetime_deposits + amount
      })
      .eq('id', wallet.id);
    
    // Record transaction
    await supabase
      .from('wallet_transactions')
      .insert({
        wallet_id: wallet.id,
        type: 'deposit',
        amount,
        balance_after: new_balance,
        stripe_transaction_id: paymentIntent.id,
        status: 'completed',
        description: 'Wallet deposit'
      });
    
    // Record deposit
    await supabase
      .from('wallet_deposits')
      .insert({
        wallet_id: wallet.id,
        amount,
        stripe_payment_intent_id: paymentIntent.id,
        status: 'completed'
      });
    
    return new Response(JSON.stringify({
      success: true,
      new_balance
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  throw new Error('Payment failed');
});
```

---

## 4. Implementation Steps by System

### Phase 1: Foundation (Weeks 1-2)

**Database Migration:**
1. Run all schema creation scripts
2. Add indexes
3. Set up RLS policies
4. Seed initial data (bundle_extras, shipping_rates)

**Pokemon TCG Integration:**
1. Create `pokemon-tcg.ts` client library
2. Implement `sync-tcg-data` edge function
3. Set up daily cron job
4. Populate `pokemon_card_attributes` table

**Pricing Comps:**
1. Create `pricing_comps` and `market_prices` tables
2. Implement `ingest-comp-data` function
3. Connect to TCG Player API
4. Set up daily sync job

### Phase 2: Wallet System (Weeks 3-4)

**Backend:**
1. Create all wallet edge functions
2. Integrate Stripe for deposits/withdrawals
3. Implement wallet transaction logging
4. Build settlement automation

**Frontend:**
1. Create `WalletBalance` component
2. Create `WalletDeposit` and `WalletWithdraw` modals
3. Create `WalletTransactions` history view
4. Add wallet display to header
5. Build `useWallet` hook

### Phase 3: Trade System (Weeks 5-6)

**Backend:**
1. Create all trade edge functions
2. Implement AI valuation
3. Build fairness scoring
4. Create trade notification system

**Frontend:**
1. Create `TradeOfferModal` component
2. Build `TradeItemSelector` with inventory view
3. Create `TradeFairnessScore` display
4. Build `TradeOfferCard` component
5. Create trade offers inbox page

### Phase 4: AI Listing Tools (Week 7)

**Backend:**
1. Implement `ai-analyse-images`
2. Create `ai-generate-description`
3. Build `ai-price-suggestion`
4. Implement `ai-auto-list-from-photos`

**Frontend:**
1. Create `QuickListModal` component
2. Build photo upload interface
3. Display AI-generated preview
4. Add "Auto-Generate" button to listing form

### Phase 5: ACP Implementation (Week 8)

**Backend:**
1. Create all ACP edge functions
2. Integrate wallet payments
3. Build inventory reservation
4. Implement risk scoring

**Frontend:**
1. Create ACP documentation page
2. Build API key management
3. Create agent testing dashboard

### Phase 6: Shipping Integration (Week 9)

**Backend:**
1. Integrate Royal Mail API
2. Integrate Evri API
3. Create label generation functions
4. Build tracking webhook handlers

**Frontend:**
1. Create `ShippingLabelViewer`
2. Build `TrackingTimeline` component
3. Add shipping method selector to listing form

### Phase 7: Media & Feed (Week 10)

**Backend:**
1. Implement video transcoding pipeline
2. Create media processing functions
3. Build feed ranking algorithm

**Frontend:**
1. Create `VideoListingPlayer` component
2. Build `VerticalFeed` component
3. Implement swipe gestures
4. Create feed page

### Phase 8: MCP Integration (Week 11)

**Backend:**
1. Create MCP server endpoint
2. Implement all MCP tool functions
3. Build `mcp.json` schema
4. Create connection documentation

**Frontend:**
1. Create MCP documentation page
2. Build tool testing interface

### Phase 9: Admin Dashboard (Week 12)

**Backend:**
1. Create all admin edge functions
2. Implement fake card review workflow
3. Build dispute resolution tools
4. Create refund processing

**Frontend:**
1. Build admin dashboard layout
2. Create fake card review queue
3. Implement order management tools
4. Create dispute resolution interface

### Phase 10: Mobile Apps (Week 13)

1. Add Capacitor to project
2. Configure iOS/Android builds
3. Implement push notifications
4. Add deep linking
5. Build and test on devices
6. Prepare store assets
7. Submit to App Store and Play Store

### Phase 11: Cloudflare (Week 14)

1. Transfer DNS to Cloudflare
2. Configure SSL/TLS
3. Set up caching rules
4. Configure WAF
5. Enable DDoS protection
6. Test and optimize

### Phase 12: Bundles & Polish (Week 15-16)

**Backend:**
1. Create bundles table and functions
2. Implement bundle pricing logic
3. Build bundle shipping calculation

**Frontend:**
1. Create `BundleCreator` component
2. Build bundle display cards
3. Add bundle filters to search

**Polish:**
1. Performance optimization
2. Bug fixes
3. UI/UX improvements
4. Documentation updates
5. Load testing
6. Security audit

---

## 5. Testing Strategy

### Unit Tests
- Edge function logic
- Pricing algorithms
- Risk scoring
- Wallet calculations

### Integration Tests
- ACP endpoint flows
- MCP tool execution
- Stripe payment processing
- Wallet transactions

### E2E Tests
- Complete purchase flow
- Trade offer creation and acceptance
- Wallet deposit and withdrawal
- Listing creation with AI
- Mobile app workflows

### Load Tests
- 1000 concurrent users
- ACP endpoint performance
- Database query optimization
- CDN cache hit rates

---

## 6. Deployment Checklist

### Environment Variables
```bash
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_PUBLIC_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Pokemon TCG API
POKEMON_TCG_API_KEY=

# Shipping APIs
ROYAL_MAIL_API_KEY=
EVRI_API_KEY=
DPD_API_KEY=

# OpenAI (for AI features)
OPENAI_API_KEY=

# Cloudflare
CLOUDFLARE_ZONE_ID=
CLOUDFLARE_API_TOKEN=
```

### Pre-Launch
- [ ] All edge functions deployed
- [ ] Database migrations applied
- [ ] RLS policies tested
- [ ] Stripe Connect configured
- [ ] Pokemon TCG API connected
- [ ] Shipping APIs integrated
- [ ] Cloudflare configured
- [ ] SSL certificates active
- [ ] Mobile apps built
- [ ] ACP endpoints tested
- [ ] MCP server functional
- [ ] Admin dashboard accessible
- [ ] Email notifications working
- [ ] Push notifications configured
- [ ] Monitoring set up (Sentry, LogRocket)
- [ ] Analytics configured (Plausible, Mixpanel)
- [ ] Backup strategy in place
- [ ] Incident response plan documented

### Post-Launch
- [ ] Monitor error rates
- [ ] Track performance metrics
- [ ] Review user feedback
- [ ] Iterate on AI models
- [ ] Optimize database queries
- [ ] Scale infrastructure as needed

---

## 7. Monitoring & Observability

### Key Metrics

**Business Metrics:**
- Daily Active Users (DAU)
- Gross Merchandise Value (GMV)
- Wallet adoption rate
- Trade offer acceptance rate
- Average transaction value
- Customer acquisition cost

**Technical Metrics:**
- API response times (p50, p95, p99)
- Error rates by endpoint
- Database query performance
- CDN cache hit rate
- Edge function execution time
- Wallet transaction success rate
- ACP completion rate
- Video transcoding time

**AI Metrics:**
- Auto-listing accuracy
- Fake card detection precision/recall
- Price suggestion variance vs actual
- Trade fairness score correlation with acceptance
- Description quality (user edit rate)

### Alerts

**Critical:**
- Payment processing failures > 1%
- Database connection errors
- Edge function timeouts > 5%
- Stripe webhook failures
- Wallet transaction errors

**Warning:**
- API response time > 1s
- Error rate > 0.5%
- Fake card detection queue > 100
- Pending wallet withdrawals > 24h old

---

## Summary

This technical blueprint provides the complete implementation architecture for 6Seven:

- ✅ **Project structure** defined
- ✅ **Database schema** specified (16 new tables)
- ✅ **45+ edge functions** outlined
- ✅ **16-week implementation plan** detailed
- ✅ **Testing strategy** established
- ✅ **Deployment checklist** provided
- ✅ **Monitoring plan** created

**Status:** Ready for implementation  
**Last Updated:** 2025-11-19  
**Next Step:** Begin Phase 1 (Foundation)
