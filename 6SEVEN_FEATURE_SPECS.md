# 6Seven - Detailed Feature Specifications

This document provides comprehensive requirements for every system in 6Seven. Use this as the authoritative requirements document for implementation.

---

## 1. ACP Implementation (Agentic Commerce Protocol)

### Objective
Full Agentic Commerce Protocol support so AI agents and LLM-based buyers can purchase, negotiate, and complete checkout without human UI interaction.

### Requirements

#### 1.1 ACP Endpoints

##### GET /acp/products
**Purpose:** Serve the entire catalog to agents

**Features:**
- Pagination support (limit, offset)
- Filtering by condition, price range, set, rarity
- Seller restrictions (exclude blocked sellers)
- Search query support

**Response Structure:**
```json
{
  "products": [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "condition": "string",
      "set_data": {
        "name": "string",
        "code": "string",
        "release_date": "string"
      },
      "rarity": "string",
      "price": number,
      "images": ["url1", "url2"],
      "video": "url",
      "seller_id": "string",
      "stock": number,
      "shipping_options": [],
      "wallet_eligible": boolean,
      "trade_enabled": boolean
    }
  ],
  "pagination": {
    "total": number,
    "limit": number,
    "offset": number
  }
}
```

##### GET /acp/product/:id
**Purpose:** Get detailed single product information

**Response Includes:**
- All product metadata
- Seller profile summary
- Shipping instructions
- Trade requirements
- Pricing history
- Comparable sales

##### POST /acp/checkout
**Purpose:** Create provisional checkout session

**Input:**
```json
{
  "product_id": "string",
  "quantity": number,
  "payment_method": "wallet|stripe",
  "shipping_address": {},
  "trade_offer": {
    "items": [],
    "cash_amount": number
  }
}
```

**Processing:**
1. Validate product availability
2. Check buyer wallet balance (if applicable)
3. Create Stripe payment intent (if needed)
4. Run risk/fraud checks
5. Reserve inventory
6. Calculate total including shipping
7. Check trade offer validity (if applicable)

**Response:**
```json
{
  "session_id": "string",
  "total_amount": number,
  "wallet_deduction": number,
  "stripe_payment_required": number,
  "reservation_expires": "timestamp",
  "risk_score": number,
  "requires_review": boolean
}
```

##### POST /acp/payment
**Purpose:** Capture final payment

**Input:**
```json
{
  "session_id": "string",
  "payment_confirmation": {}
}
```

**Processing:**
1. Verify session validity
2. Deduct wallet balance (if applicable)
3. Capture Stripe payment (if applicable)
4. Record payment event
5. Update transaction log

**Response:**
```json
{
  "payment_id": "string",
  "status": "completed|failed",
  "error": "string"
}
```

##### POST /acp/confirm
**Purpose:** Finalize the order

**Input:**
```json
{
  "session_id": "string",
  "payment_id": "string"
}
```

**Processing:**
1. Create order record in database
2. Trigger shipping label generation
3. Send notifications (buyer + seller)
4. Update inventory
5. Process wallet settlements
6. Record in transaction history

**Response:**
```json
{
  "order_id": "string",
  "tracking_number": "string",
  "estimated_delivery": "date",
  "status": "confirmed"
}
```

#### 1.2 Data Rules

- Every product MUST follow strict schema validation
- All ACP transactions MUST complete without human input
- All endpoints MUST be deterministic and agent-safe
- All responses MUST include proper error codes
- All timestamps MUST be in ISO 8601 format

#### 1.3 Security Requirements

- API key authentication for agents
- Rate limiting per agent (1000 req/hour)
- RLS policies bypass for ACP service role
- Audit logging for all ACP transactions
- Fraud detection on all purchases

---

## 2. Pokémon TCG API Integration

### Objective
Auto-populate all form fields and maintain uniform structured data across all listings.

### Requirements

#### 2.1 Dropdown Fields

All listing forms must include these fields populated from TCG API:

- **Set** - Full set list with release dates
- **Rarity** - Common, Uncommon, Rare, Ultra Rare, etc.
- **Card Number** - Position in set (e.g., 25/102)
- **Variant** - Holo, Reverse Holo, First Edition, etc.
- **Supertype** - Pokémon, Trainer, Energy
- **Subtype** - Basic, Stage 1, Stage 2, VMAX, etc.
- **HP** - Hit points (for Pokémon cards)
- **Artist** - Card illustrator name
- **Expansion** - Base Set, Jungle, Fossil, etc.
- **Legalities** - Standard, Expanded, Unlimited

#### 2.2 Data Sync Job

**Frequency:** Daily at 2 AM UTC

**Process:**
1. Call Pokémon TCG API for all sets
2. For each set, fetch all cards
3. Store in `pokemon_card_attributes` table
4. Update existing records
5. Mark discontinued sets
6. Log sync results

**Table Structure:**
```sql
CREATE TABLE pokemon_card_attributes (
  id UUID PRIMARY KEY,
  card_id VARCHAR(255) UNIQUE,
  name VARCHAR(255),
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
  last_updated TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 2.3 Auto-Detection Integration

When AI analyzes uploaded photos:
1. Detect card name
2. Lookup in `pokemon_card_attributes`
3. Return all matching attributes
4. Auto-fill listing form
5. Allow seller to override if needed

---

## 3. Shipping Contracts

### Objective
Shipping automation for UK (and future US) markets with print-at-home labels.

### Requirements

#### 3.1 Carrier Integrations

##### Royal Mail
- **Services:** First Class, Second Class, Signed For, Special Delivery
- **API:** Royal Mail Click & Drop API
- **Label Format:** PDF
- **Tracking:** Yes

##### Evri (formerly Hermes)
- **Services:** Standard, Next Day, Locker Drop
- **API:** Evri Business API
- **Label Format:** PDF
- **Tracking:** Yes

##### DPD
- **Services:** Next Day, Saturday Delivery
- **API:** DPD API
- **Label Format:** PDF + Print-at-home
- **Tracking:** Real-time

##### ParcelForce
- **Services:** Express 24, Express 48
- **API:** ParcelForce API
- **Label Format:** PDF
- **Tracking:** Yes

#### 3.2 Features

##### Automatic Label Creation
1. Order confirmed
2. Select carrier based on seller preference or buyer choice
3. Call carrier API with:
   - Sender address (seller)
   - Recipient address (buyer)
   - Package dimensions
   - Weight
   - Service level
4. Receive label PDF
5. Store in Supabase Storage
6. Email to seller

##### Print-at-Home PDF
- Standard A4 format
- Clear barcode/tracking number
- Sender/recipient addresses
- Service instructions
- Return address

##### Tracking Integration
- Webhook endpoints for each carrier
- Update `shipping_events` table
- Send email notifications on:
  - Label created
  - Posted
  - In transit
  - Out for delivery
  - Delivered
  - Failed delivery

##### Rate Calculator
- Real-time shipping cost calculation
- Based on:
  - Destination postcode
  - Package weight
  - Package dimensions
  - Service level
- Display during listing creation
- Display during checkout

#### 3.3 Database Schema

```sql
CREATE TABLE shipping_labels (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  carrier VARCHAR(50),
  service_level VARCHAR(100),
  tracking_number VARCHAR(255) UNIQUE,
  label_url TEXT,
  cost DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE shipping_events (
  id UUID PRIMARY KEY,
  label_id UUID REFERENCES shipping_labels(id),
  status VARCHAR(100),
  location VARCHAR(255),
  timestamp TIMESTAMP,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE carrier_contracts (
  id UUID PRIMARY KEY,
  carrier VARCHAR(50),
  api_key TEXT ENCRYPTED,
  api_secret TEXT ENCRYPTED,
  account_number VARCHAR(255),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE shipping_rates (
  id UUID PRIMARY KEY,
  carrier VARCHAR(50),
  service_level VARCHAR(100),
  weight_min DECIMAL(10,2),
  weight_max DECIMAL(10,2),
  base_cost DECIMAL(10,2),
  per_kg_cost DECIMAL(10,2),
  last_updated TIMESTAMP
);
```

---

## 4. Customer Service Backend

### Objective
Internal administrative tools for dispute resolution, refunds, fake card checks, moderation, and support.

### Requirements

#### 4.1 Admin Dashboard Modules

##### Orders Module
- View all orders
- Filter by status, date, seller, buyer
- Search by order ID
- Refund processing
- Shipping override
- Order cancellation

##### Conversations Module
- View all message threads
- Flag inappropriate content
- Ban users
- Review reported messages
- Export conversation logs

##### Trade Offers Module
- View all trade offers
- Review disputed trades
- Manual valuation override
- Approve/reject pending trades
- Trade history logs

##### Verification Requests Module
- Identity verification queue
- Business verification queue
- Manual review tools
- Document upload review
- Approval/rejection workflow

##### Fake Card Review Queue
- AI flagged listings
- Video review interface
- Approve/reject decisions
- Seller notification
- Statistics dashboard

##### Refund Processing
- Full refund
- Partial refund
- Store credit option
- Wallet credit option
- Reason codes
- Seller debit

##### User Reports
- View all reports
- User safety scores
- Ban/suspend users
- Warning issuance
- Report resolution workflow

##### Risk Score Editor
- Manual risk score override
- View risk factors
- Historical risk timeline
- Whitelist/blacklist management

#### 4.2 Edge Functions

```typescript
// admin-refund
POST /admin/refund
Input: { order_id, amount, reason, method }

// admin-flag-user
POST /admin/flag-user
Input: { user_id, reason, action }

// admin-review-trade
POST /admin/review-trade
Input: { trade_id, decision, notes }

// admin-fake-card-decision
POST /admin/fake-card-decision
Input: { scan_id, decision, notes, require_removal }

// admin-message-override
POST /admin/message-override
Input: { message_id, action, reason }
```

#### 4.3 UI Requirements

- Full-screen dashboard layout
- Role-based access control (Admin, Support, Moderator)
- Search by order ID, user ID, listing ID
- Real-time notifications for urgent issues
- Keyboard shortcuts for common actions
- Bulk actions support
- Export to CSV functionality

---

## 5. Listing Media Support

### Objective
Listings must accept rich media including multiple photos and videos.

### Requirements

#### 5.1 Image Support

**Upload Limits:**
- Maximum 12 images per listing
- Max file size: 10MB per image
- Formats: JPEG, PNG, WebP

**Processing Pipeline:**
1. Client uploads to Supabase Storage
2. Server-side compression (lossless up to 2MB, lossy beyond)
3. Generate thumbnails (300x300, 600x600)
4. AI enhancement option (brightness, contrast, sharpness)
5. Quality validation (min resolution 800x800)
6. Extract EXIF data
7. Store URLs in listing record

**AI Enhancement:**
- Auto-crop to card borders
- Color correction
- Background cleanup
- Perspective correction
- Glare reduction

#### 5.2 Video Support

**Upload Limits:**
- Maximum 1 video per listing
- Max duration: 30 seconds
- Max file size: 50MB
- Formats: MP4, MOV, WebM

**Processing Pipeline:**
1. Upload to Supabase Storage
2. Transcode to MP4 (H.264)
3. Generate poster frame thumbnail
4. Compress to target bitrate (2Mbps)
5. Extract metadata (duration, resolution)
6. Store URL in listing record

**Video Guidelines:**
- Show card front and back
- Demonstrate condition (corners, edges, surface)
- Show holographic effect
- Rotate card for texture visibility

#### 5.3 Database Schema

```sql
CREATE TABLE listing_media (
  id UUID PRIMARY KEY,
  listing_id UUID REFERENCES listings(id),
  type VARCHAR(20), -- 'image' or 'video'
  url TEXT,
  thumbnail_url TEXT,
  position INTEGER,
  ai_enhanced BOOLEAN DEFAULT false,
  quality_score DECIMAL(3,2),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 6. Trade + Cash Offer Engine

### Objective
Allow users to propose trade + cash combination deals with automatic valuation and fairness scoring.

### Requirements

#### 6.1 Trade Offer Structure

```sql
CREATE TABLE trade_offers (
  id UUID PRIMARY KEY,
  buyer_id UUID REFERENCES profiles(id),
  seller_id UUID REFERENCES profiles(id),
  target_listing_id UUID REFERENCES listings(id),
  cash_amount DECIMAL(10,2),
  trade_items JSONB, -- Array of buyer's listings
  trade_item_valuations JSONB,
  photos TEXT[], -- Photos of trade items
  ai_valuation_summary TEXT,
  ai_fairness_score DECIMAL(3,2), -- 0.00 to 1.00
  status VARCHAR(50), -- pending, accepted, rejected, countered, expired
  expiry_date TIMESTAMP,
  counter_offer_id UUID REFERENCES trade_offers(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);
```

#### 6.2 User Workflow

##### Buyer Side:
1. Navigate to listing
2. Click "Make Trade Offer" button
3. Select items from their inventory
4. For each item:
   - System suggests value
   - Buyer can override
   - Attach photos
5. Add cash amount (optional)
6. System calculates total offer value
7. AI generates fairness score
8. Review and submit

##### Seller Side:
1. Receive notification
2. View trade offer dashboard
3. See:
   - Trade items with photos
   - Individual valuations
   - Total value calculation
   - Cash portion
   - AI fairness assessment
   - Comparable sales data
4. Options:
   - Accept
   - Reject (with optional reason)
   - Counter (adjust values or items)

##### Counter-Offer Flow:
- Seller modifies cash amount or valuations
- System recalculates fairness score
- Buyer receives notification
- Buyer accepts or rejects
- Maximum 3 counter-offers per trade

#### 6.3 AI Jobs

##### ai-trade-valuation
**Input:** Trade item listing IDs  
**Output:** Suggested value for each item based on:
- Recent comparable sales
- Current market price
- Condition
- Rarity
- Demand trends

##### ai-trade-summary
**Input:** Complete trade offer  
**Output:** Natural language summary:
```
"Trade offer: [Buyer] is offering 3 cards (Charizard VMAX PSA 9, 
Pikachu VMAX, Blastoise Holo) valued at £245 + £30 cash for your 
Umbreon VMAX Alt Art (valued at £280). AI assessment: Fair trade 
(94% fairness score)."
```

##### ai-fairness-score
**Input:** Trade offer with valuations  
**Algorithm:**
1. Calculate total buyer offer value
2. Calculate target listing value
3. Compare to market comps
4. Factor in demand differentials
5. Consider condition parity
6. Output score 0.00-1.00:
   - 0.95-1.00: Excellent deal
   - 0.85-0.94: Fair deal
   - 0.70-0.84: Questionable
   - <0.70: Unfair

#### 6.4 Trade Acceptance Flow

When seller accepts:
1. Lock both parties' items
2. Create two-way order:
   - Buyer ships trade items to seller
   - Seller ships target item to buyer
3. Generate shipping labels for both
4. Process cash payment (wallet or Stripe)
5. Update inventory for both users
6. Send notifications
7. Track both shipments
8. Confirm receipt from both parties
9. Release items from lock
10. Complete trade

---

## 7. AI Description Engine

### Objective
Auto-generate listing descriptions using structured metadata, pricing comps, and condition assessment.

### Requirements

#### 7.1 Edge Function: ai-generate-description

**Input:**
```json
{
  "card_data": {
    "name": "string",
    "set": "string",
    "rarity": "string",
    "number": "string"
  },
  "condition": "string",
  "pricing_comps": [],
  "seller_notes": "string"
}
```

**Output:**
```json
{
  "short_description": "string (50 chars)",
  "long_description": "string (500 chars)",
  "key_features": ["feature1", "feature2"],
  "tags": ["tag1", "tag2"],
  "recommended_price": number
}
```

**Description Components:**

##### Short Description (50 chars max)
Example: "Charizard VMAX Rainbow Rare - Near Mint PSA 9"

##### Long Description (500 chars)
Template:
```
[Card Name] from the [Set Name] set ([Year]). This [Rarity] card 
is in [Condition] condition. Card number [#/Total]. 

[Condition details based on seller notes]

[Notable features: holofoil pattern, alternate art, etc.]

[Market context: popular card, climbing value, etc.]

Perfect for [collectors/players/investors].
```

##### Key Features (Bullet Points)
- Rarity level
- Condition grade
- Set and year
- Special attributes (holo, full art, etc.)
- Grading potential

##### Auto-Generated Tags
- Card name
- Set name
- Pokémon character
- Rarity
- Condition
- Year
- Artist
- Type

#### 7.2 Integration Points

- Listing form "Auto-Generate" button
- Bulk upload tool
- AI auto-listing from photos
- Edit listing page

#### 7.3 Seller Override

- All AI-generated content is editable
- Show "AI Generated" badge
- Allow toggle between AI and manual mode
- Save both versions

---

## 8. Fake Card AI Detector

### Objective
Two-step system: AI pre-screen for authenticity, escalate to human review when flagged.

### Requirements

#### 8.1 Edge Functions

##### fake-card-scan
**Trigger:** On image upload  
**Process:**
1. Analyze uploaded images using computer vision
2. Check:
   - Hologram pattern authenticity
   - Print quality and registration
   - Corner cutting precision
   - Font rendering
   - Color saturation
   - Border thickness
   - Text spacing
3. Generate confidence score (0-100)
4. Flag if score < 70

**Response:**
```json
{
  "scan_id": "uuid",
  "confidence_score": 75,
  "flagged": true,
  "issues_detected": [
    "Hologram pattern inconsistent",
    "Font kerning abnormal"
  ],
  "video_required": true
}
```

##### fake-card-video-request
**Trigger:** When AI flags listing  
**Process:**
1. Notify seller
2. Request video showing:
   - Card front and back
   - Hologram at multiple angles
   - Card flex test
   - Light pass-through test
3. Set 48-hour deadline
4. Hold listing until video uploaded

##### fake-card-review
**Trigger:** Manual review in admin dashboard  
**Process:**
1. Admin views:
   - Original photos
   - AI scan results
   - Seller video
   - Seller history
2. Decision options:
   - Approve (authentic)
   - Reject (fake - remove listing + warn seller)
   - Request more info
3. Log decision with notes

#### 8.2 Database Schema

```sql
CREATE TABLE fake_card_results (
  id UUID PRIMARY KEY,
  listing_id UUID REFERENCES listings(id),
  scan_id UUID,
  ai_confidence_score DECIMAL(5,2),
  flagged BOOLEAN,
  issues_detected JSONB,
  video_required BOOLEAN,
  video_url TEXT,
  manual_review_status VARCHAR(50), -- pending, approved, rejected
  manual_review_notes TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 8.3 Seller Communication

**AI Flag Email:**
```
Subject: Action Required: Video Verification Needed

Hi [Seller],

Our AI system has flagged your listing "[Card Name]" for additional 
verification. This is a standard security measure to protect buyers.

Please upload a short video (15-30 seconds) showing:
- Front and back of the card
- Hologram at different angles
- A gentle flex test

Upload video here: [Link]
Deadline: 48 hours

Your listing is temporarily hidden until verification is complete.
```

**Approval Email:**
```
Subject: Listing Approved - Now Live

Your listing "[Card Name]" has been verified and is now live.
```

**Rejection Email:**
```
Subject: Listing Removed - Authenticity Concern

Unfortunately, we cannot approve your listing "[Card Name]" as it 
does not meet our authenticity standards.

[Reason]

If you believe this is an error, please contact support with proof 
of purchase.
```

---

## 9. TikTok-Style Shopping Feed

### Objective
Vertical swipe interface for immersive card browsing with AI-curated recommendations.

### Requirements

#### 9.1 UI Components

**Layout:**
- Full-screen vertical feed
- Single card per view
- Auto-advance on swipe up/down
- Video or image primary display
- Overlay UI controls

**Controls:**
- Add to Cart button (bottom)
- Like/Save button (right side)
- Share button (right side)
- Seller profile (top left)
- Price (top right)
- Card details (expandable bottom sheet)

#### 9.2 Content Loading

**Strategy:** Infinite scroll with pre-loading

**Algorithm:**
1. Load initial 10 items
2. When user reaches item 7, load next 10
3. Remove items older than 20 positions
4. Use AI ranking for relevance

**Data Source:**
```sql
CREATE VIEW listing_feed AS
SELECT 
  l.*,
  p.username as seller_username,
  p.avatar_url as seller_avatar,
  p.rating as seller_rating,
  (
    SELECT COUNT(*) FROM listing_likes WHERE listing_id = l.id
  ) as likes_count,
  ai_ranking_score(l.id, current_user_id) as relevance_score
FROM listings l
JOIN profiles p ON l.seller_id = p.id
WHERE l.status = 'active'
ORDER BY relevance_score DESC, l.created_at DESC;
```

#### 9.3 AI Ranking Function

**Inputs:**
- User's viewing history
- User's liked cards
- User's collection focus (detected from purchases)
- Card popularity
- Listing freshness
- Seller reputation
- Price alignment with user's spending

**Output:** Relevance score (0-100)

**Algorithm:**
```
score = (
  user_interest_match * 0.30 +
  popularity * 0.20 +
  freshness * 0.15 +
  seller_reputation * 0.15 +
  price_fit * 0.10 +
  engagement_rate * 0.10
)
```

#### 9.4 Video Handling

- Autoplay on view (muted)
- Loop continuously
- Tap to unmute
- Pause on swipe away
- Preload next video

#### 9.5 Interactions

**Swipe Up:** Next card  
**Swipe Down:** Previous card  
**Tap:** Pause/Play video  
**Double Tap:** Like  
**Long Press:** View details  
**Swipe Right:** Save for later  
**Swipe Left:** Not interested (train AI)

---

## 10. 6Seven Wallet System

### Objective
Internal balance system to reduce Stripe fees, enable instant trade settlements, and improve user experience.

### Requirements

#### 10.1 Wallet Capabilities

##### Deposit Money
- Link bank account or debit card
- Minimum deposit: £10
- Maximum deposit: £1,000 per transaction
- Stripe ACH or card processing
- Instant availability

##### Withdraw Money
- Minimum withdrawal: £10
- Maximum withdrawal: £10,000 per day
- Transfer to linked bank account
- 1-2 business day processing
- Stripe Connect transfer

##### Internal Transfers
- Send money to other 6Seven users
- Free of charge
- Instant transfer
- Used for trade settlements

##### Seller Earnings Pool
- Automatic deposits from sales
- Hold period: 3 days (fraud protection)
- Auto-release after buyer confirmation
- Can withdraw or use for purchases

##### Fee Reduction
- Wallet payments: 1% fee (vs 3% Stripe)
- Encourage wallet usage with badges
- Prompt users to deposit before large purchases

##### Trade Support
- Lock funds during trade negotiation
- Auto-top-up if balance insufficient
- Split payments (wallet + card)

#### 10.2 Database Schema

```sql
CREATE TABLE wallet_accounts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) UNIQUE,
  balance DECIMAL(10,2) DEFAULT 0.00,
  pending_balance DECIMAL(10,2) DEFAULT 0.00,
  lifetime_deposits DECIMAL(10,2) DEFAULT 0.00,
  lifetime_withdrawals DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY,
  wallet_id UUID REFERENCES wallet_accounts(id),
  type VARCHAR(50), -- deposit, withdrawal, purchase, sale, transfer_in, transfer_out
  amount DECIMAL(10,2),
  balance_after DECIMAL(10,2),
  related_user_id UUID, -- For transfers
  related_order_id UUID, -- For purchases/sales
  stripe_transaction_id VARCHAR(255),
  status VARCHAR(50), -- pending, completed, failed
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE wallet_deposits (
  id UUID PRIMARY KEY,
  wallet_id UUID REFERENCES wallet_accounts(id),
  amount DECIMAL(10,2),
  stripe_payment_intent_id VARCHAR(255),
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE wallet_withdrawals (
  id UUID PRIMARY KEY,
  wallet_id UUID REFERENCES wallet_accounts(id),
  amount DECIMAL(10,2),
  bank_account_id VARCHAR(255),
  stripe_transfer_id VARCHAR(255),
  status VARCHAR(50), -- pending, processing, completed, failed
  initiated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE TABLE wallet_settlements (
  id UUID PRIMARY KEY,
  seller_wallet_id UUID REFERENCES wallet_accounts(id),
  order_id UUID REFERENCES orders(id),
  amount DECIMAL(10,2),
  fee_amount DECIMAL(10,2),
  net_amount DECIMAL(10,2),
  hold_until TIMESTAMP,
  released_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 10.3 Edge Functions

##### wallet-deposit
```typescript
POST /wallet/deposit
Input: { amount: number, payment_method_id: string }
Process:
1. Validate amount (min £10, max £1,000)
2. Create Stripe PaymentIntent
3. Confirm payment
4. Credit wallet balance
5. Record transaction
```

##### wallet-withdraw
```typescript
POST /wallet/withdraw
Input: { amount: number, bank_account_id: string }
Process:
1. Validate amount and balance
2. Create pending withdrawal
3. Initiate Stripe Connect transfer
4. Debit wallet balance
5. Record transaction
```

##### wallet-transfer
```typescript
POST /wallet/transfer
Input: { recipient_user_id: string, amount: number, note: string }
Process:
1. Validate balance
2. Lock amount
3. Debit sender
4. Credit recipient
5. Record both transactions
6. Send notifications
```

##### wallet-settlement
```typescript
POST /wallet/settlement (internal)
Trigger: Order completed + 3 days hold
Process:
1. Calculate seller earnings (price - fees)
2. Credit seller wallet
3. Release from pending
4. Send notification
```

#### 10.4 ACP Integration

All ACP checkout endpoints must support:
- Check wallet balance
- Deduct from wallet first
- Use Stripe for remainder
- Split transactions properly
- Record all payment sources

**Example:**
```
Order total: £100
Wallet balance: £70
Process:
1. Deduct £70 from wallet
2. Charge £30 to Stripe
3. Record both transactions
4. Complete order
```

#### 10.5 UI Requirements

**Header Display:**
- Show wallet balance
- Click to view wallet page
- Badge for pending earnings

**Wallet Page Sections:**
- Current balance (large)
- Pending earnings (with release date)
- Recent transactions (paginated)
- Add money button
- Withdraw button
- Transaction history

**Checkout Integration:**
- Show wallet balance
- "Use wallet balance" checkbox
- Show remaining amount to charge
- Clear breakdown of payment sources

---

## 11. Mobile Apps (iOS & Android)

### Objective
Native iOS and Android apps using Capacitor to wrap existing React application.

### Requirements

#### 11.1 Technology Stack
- **Framework:** Capacitor (preferred) or Expo
- **Source:** Existing React codebase
- **Platforms:** iOS 14+, Android 8+

#### 11.2 Core Features

##### Push Notifications
- New message
- Trade offer received
- Order update
- Price drop alert
- Listing sold
- Shipment tracking updates

##### Deep Linking
- `/listing/:id` → Open listing detail
- `/messages/:conversation_id` → Open chat
- `/orders/:order_id` → Open order detail
- `/profile/:username` → Open profile

##### Native Integrations
- Camera access for photo/video upload
- Photo library access
- Biometric authentication (Face ID, Touch ID)
- Secure storage for auth tokens
- Share sheet integration

##### Offline Support
- Cache viewed listings
- Queue actions when offline
- Sync when reconnected

#### 11.3 Configuration

**capacitor.config.ts:**
```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sixseven.marketplace',
  appName: '6Seven',
  webDir: 'dist',
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    Camera: {
      allowEditing: true,
      quality: 90,
    },
  },
};

export default config;
```

#### 11.4 Store Assets

**iOS (App Store):**
- App icon (1024x1024)
- Screenshots (6.5", 5.5" displays)
- App preview video (optional)
- Description (max 4,000 chars)
- Keywords
- Support URL
- Privacy policy URL

**Android (Play Store):**
- App icon (512x512)
- Feature graphic (1024x500)
- Screenshots (phone + tablet)
- Description (max 4,000 chars)
- Privacy policy URL

#### 11.5 Build Process

**iOS:**
```bash
npx cap add ios
npx cap sync ios
npx cap open ios
# Build in Xcode
```

**Android:**
```bash
npx cap add android
npx cap sync android
npx cap open android
# Build in Android Studio
```

#### 11.6 CI/CD Pipeline
- Automated builds on git push
- TestFlight distribution (iOS)
- Internal testing track (Android)
- Version number auto-increment
- Release notes generation

---

## 12. Cloudflare Setup

### Objective
Improve security, performance, and reduce load on Lovable Cloud hosting.

### Requirements

#### 12.1 DNS Configuration

1. Transfer DNS to Cloudflare
2. Add A record pointing to Lovable Cloud IP
3. Add CNAME for www → apex
4. Add MX records for email
5. Enable Cloudflare proxy (orange cloud)

#### 12.2 SSL/TLS

- **Mode:** Full (Strict)
- **Minimum TLS:** 1.2
- **Always Use HTTPS:** Enabled
- **Automatic HTTPS Rewrites:** Enabled
- **Certificate:** Universal SSL

#### 12.3 Caching Rules

**Static Assets (Cache Everything):**
- `/assets/*` → 1 year
- `/images/*` → 1 year
- `*.jpg, *.png, *.svg, *.webp` → 1 year
- `*.css, *.js` → 1 day

**Dynamic Routes (Bypass Cache):**
- `/api/*`
- `/functions/*`
- `/acp/*`
- `/mcp/*`

**Cache Key Configuration:**
- Ignore query strings on images
- Cache by device type (mobile/desktop)

#### 12.4 WAF Rules

**Basic Protection:**
- Block SQL injection patterns
- Block XSS attempts
- Rate limit: 100 req/10sec per IP
- Challenge suspicious user agents
- Block Tor exit nodes (optional)

**Custom Rules:**
```
(http.request.uri.path contains "/admin" and not cf.threat_score < 10)
→ Block

(http.request.uri.path eq "/acp/checkout" and cf.bot_management.score < 30)
→ Challenge

(rate.limit > 1000 requests/hour)
→ Block for 1 hour
```

#### 12.5 DDoS Protection

- Automatic DDoS mitigation (Layer 3/4)
- HTTP DDoS protection (Layer 7)
- Rate limiting on API endpoints
- Challenge page for suspicious traffic

#### 12.6 Bot Management

- **Mode:** Fight Mode (free) or Bot Management (paid)
- Allow verified bots (Google, Bing)
- Challenge unverified bots
- Block bad bots
- Whitelist ACP/MCP agents

#### 12.7 Performance Settings

- **Brotli Compression:** Enabled
- **HTTP/2:** Enabled
- **HTTP/3 (QUIC):** Enabled
- **Auto Minify:** HTML, CSS, JS
- **Rocket Loader:** Disabled (React app)
- **Mirage:** Enabled (image optimization)

#### 12.8 Page Rules

1. `sixseven.com/assets/*`
   - Cache Level: Cache Everything
   - Edge Cache TTL: 1 year

2. `sixseven.com/api/*`
   - Cache Level: Bypass
   - Disable Apps
   - Disable Performance

3. `sixseven.com/admin*`
   - Security Level: High
   - Browser Integrity Check: On

---

## 13. MCP Setup (Model Context Protocol)

### Objective
Expose 6Seven programmatically to AI agents for searching, listing, pricing, trading, and purchasing.

### Requirements

#### 13.1 MCP Server Architecture

**Deployment:** Supabase Edge Function  
**Endpoint:** `https://api.sixseven.com/mcp`  
**Protocol:** JSON-RPC 2.0 over HTTP  
**Authentication:** API key per agent

#### 13.2 MCP Tools

##### search_listings
**Description:** Search for cards in the marketplace  
**Parameters:**
- `query` (string): Search term
- `filters` (object): Condition, rarity, set, price range
- `limit` (number): Max results (default 20)

**Returns:** Array of listing objects

##### get_listing
**Description:** Get detailed information about a specific listing  
**Parameters:**
- `listing_id` (string): Unique listing identifier

**Returns:** Full listing object with seller info

##### create_listing
**Description:** Create a new listing  
**Parameters:**
- `card_data` (object): Name, set, condition, etc.
- `price` (number): Asking price
- `images` (array): Image URLs
- `description` (string): Optional seller notes

**Returns:** Created listing object

##### update_listing
**Description:** Modify an existing listing  
**Parameters:**
- `listing_id` (string)
- `updates` (object): Fields to update

**Returns:** Updated listing object

##### evaluate_price
**Description:** Get AI-suggested pricing for a card  
**Parameters:**
- `card_data` (object): Name, set, condition

**Returns:**
```json
{
  "suggested_price": 45.00,
  "market_low": 38.00,
  "market_high": 52.00,
  "recent_sales": [],
  "confidence": 0.87
}
```

##### auto_list_from_photos
**Description:** Create listing automatically from uploaded photos  
**Parameters:**
- `image_urls` (array): URLs of card photos

**Returns:** Auto-generated listing draft

##### submit_trade_offer
**Description:** Propose a trade to a seller  
**Parameters:**
- `target_listing_id` (string)
- `trade_items` (array): Buyer's cards to trade
- `cash_amount` (number): Additional cash

**Returns:** Trade offer object

##### purchase_item
**Description:** Buy a listing  
**Parameters:**
- `listing_id` (string)
- `payment_method` (string): "wallet" or "stripe"
- `shipping_address` (object)

**Returns:** Order confirmation

##### get_wallet_balance
**Description:** Check user's wallet balance  
**Parameters:** None

**Returns:**
```json
{
  "available_balance": 125.50,
  "pending_balance": 45.00
}
```

##### deposit
**Description:** Add money to wallet  
**Parameters:**
- `amount` (number)
- `payment_method_id` (string)

**Returns:** Transaction confirmation

##### withdraw
**Description:** Withdraw money from wallet  
**Parameters:**
- `amount` (number)
- `bank_account_id` (string)

**Returns:** Withdrawal request object

##### ai_detect_fake
**Description:** Scan card images for authenticity  
**Parameters:**
- `image_urls` (array)

**Returns:**
```json
{
  "authenticity_score": 0.92,
  "flagged": false,
  "issues": []
}
```

##### list_inventory
**Description:** Get user's current inventory  
**Parameters:**
- `filters` (object): Optional filters

**Returns:** Array of owned listings

#### 13.3 mcp.json Schema

```json
{
  "name": "6seven-marketplace",
  "version": "1.0.0",
  "description": "AI-native trading card marketplace with cash + trade offers",
  "server": {
    "endpoint": "https://api.sixseven.com/mcp",
    "protocol": "http",
    "authentication": "api_key"
  },
  "tools": [
    {
      "name": "search_listings",
      "description": "Search for trading cards",
      "parameters": {
        "query": { "type": "string", "required": true },
        "filters": { "type": "object", "required": false },
        "limit": { "type": "number", "required": false }
      }
    },
    // ... (all other tools)
  ]
}
```

#### 13.4 Implementation Files

**Location:** `/supabase/functions/mcp/`

Files needed:
- `mcp-server.ts` - Main MCP endpoint
- `mcp-search.ts` - Search implementation
- `mcp-create-listing.ts` - Create listing
- `mcp-evaluate-price.ts` - Price evaluation
- `mcp-auto-list.ts` - Auto-listing from photos
- `mcp-trade-offer.ts` - Trade proposals
- `mcp-buy.ts` - Purchase flow
- `mcp-wallet.ts` - Wallet operations
- `mcp-detect-fake.ts` - Fake detection
- `mcp-list-inventory.ts` - Inventory management

#### 13.5 RLS Exceptions

Create service role bypass for MCP server:
```sql
-- Allow MCP service role to bypass RLS
CREATE POLICY "MCP service access" ON listings
FOR ALL TO service_role
USING (true);
```

#### 13.6 Rate Limiting

- 1,000 requests/hour per API key
- 10,000 requests/day per API key
- Upgradeable to enterprise limits

#### 13.7 Connection Instructions

**For Agent Developers:**
```
1. Request API key from 6Seven dashboard
2. Add MCP server to your agent config:
   {
     "mcpServers": {
       "sixseven": {
         "url": "https://api.sixseven.com/mcp",
         "apiKey": "YOUR_API_KEY"
       }
     }
   }
3. Import tools in your agent
4. Start trading!
```

---

## 14. AI Auto-Listing from Photos

### Objective
One-tap listing creation: upload photos → AI detects card → auto-fills form → publishes.

### Requirements

#### 14.1 Workflow

**User Actions:**
1. Click "Quick List" button
2. Upload 1-12 photos
3. Review auto-generated listing
4. Click "Publish"

**System Actions:**
1. Receive uploaded images
2. AI analyzes images to detect:
   - Card name
   - Set name and code
   - Card number
   - Condition (Near Mint, Excellent, etc.)
   - Visible damage or wear
   - Holographic pattern
3. Query Pokémon TCG API for attributes
4. Fetch pricing comps from database
5. Generate suggested price
6. Generate description
7. Prepare full listing draft
8. Show preview to user
9. On confirmation, publish listing

#### 14.2 Edge Function: auto-list-from-photos

**Input:**
```json
{
  "image_urls": ["url1", "url2", "url3"],
  "seller_notes": "Optional notes"
}
```

**Processing Steps:**

**Step 1: Image Analysis**
```typescript
const analysis = await analyzeCardImages(image_urls);
// Returns: {
//   card_name: "Charizard",
//   set_name: "Base Set",
//   card_number: "4/102",
//   condition: "Near Mint",
//   confidence: 0.94
// }
```

**Step 2: Fetch Attributes**
```typescript
const attributes = await fetchPokemonTCGData(
  analysis.card_name,
  analysis.set_name
);
```

**Step 3: Get Pricing**
```typescript
const pricing = await getPricingComps(
  attributes.card_id,
  analysis.condition
);
```

**Step 4: Generate Description**
```typescript
const description = await generateDescription({
  card_data: attributes,
  condition: analysis.condition,
  pricing_comps: pricing,
  seller_notes: seller_notes
});
```

**Step 5: Create Draft**
```typescript
const draft = {
  title: `${attributes.name} - ${attributes.set_name} - ${analysis.condition}`,
  description: description.long_description,
  price: pricing.suggested_price,
  condition: analysis.condition,
  images: image_urls,
  attributes: attributes,
  status: 'draft'
};
```

**Output:**
```json
{
  "listing_draft": { /* draft object */ },
  "confidence_score": 0.94,
  "warnings": [],
  "suggestions": [
    "Consider adding a video for high-value card",
    "Price is 8% below market average - could price higher"
  ]
}
```

#### 14.3 UI Components

**QuickListModal:**
- Photo upload dropzone
- Progress indicator during AI processing
- Preview of detected card
- Editable form fields with AI suggestions
- Confidence score display
- Publish button

#### 14.4 Bulk Upload

**For Power Sellers:**
- Upload up to 50 cards at once
- AI processes each card separately
- Batch creates all listings
- Shows success/failure summary
- Allows manual review of low-confidence detections

---

## 15. Price Based on Sold Comps

### Objective
Automated pricing insights using historical sales data.

### Requirements

#### 15.1 Data Sources

##### Internal Sales
- Track all completed sales on 6Seven
- Store: card_id, condition, price, date

##### External Sources
- **TCG Player API:** Last sold prices
- **eBay API:** Recently sold listings
- **PokeData:** Aggregated pricing data

#### 15.2 Data Ingestion Job

**Frequency:** Daily at 3 AM UTC

**Process:**
```typescript
async function ingestCompData() {
  // 1. Fetch from TCG Player
  const tcgComps = await fetchTCGPlayerSales();
  
  // 2. Fetch from eBay
  const ebayComps = await fetchEbaySales();
  
  // 3. Normalize data
  const normalized = normalizeComps([...tcgComps, ...ebayComps]);
  
  // 4. Store in database
  await storePricingComps(normalized);
  
  // 5. Calculate market prices
  await calculateMarketPrices();
}
```

#### 15.3 Database Schema

```sql
CREATE TABLE pricing_comps (
  id UUID PRIMARY KEY,
  card_id VARCHAR(255), -- Pokemon TCG API ID
  source VARCHAR(50), -- tcgplayer, ebay, internal
  condition VARCHAR(50),
  sold_price DECIMAL(10,2),
  sold_date DATE,
  marketplace VARCHAR(100),
  url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_pricing_comps_card ON pricing_comps(card_id, condition, sold_date DESC);

CREATE TABLE market_prices (
  id UUID PRIMARY KEY,
  card_id VARCHAR(255) UNIQUE,
  condition VARCHAR(50),
  average_price DECIMAL(10,2),
  median_price DECIMAL(10,2),
  low_price DECIMAL(10,2),
  high_price DECIMAL(10,2),
  sample_size INTEGER,
  last_updated TIMESTAMP DEFAULT NOW()
);
```

#### 15.4 Pricing Suggestion Algorithm

**Input:**
- Card ID
- Condition
- Seller intent (quick sale, max profit, market rate)

**Process:**
```typescript
function suggestPrice(card_id: string, condition: string, intent: string) {
  // Get comps from last 30 days
  const comps = getPricingComps(card_id, condition, 30);
  
  if (comps.length < 3) {
    // Insufficient data - use TCG market price
    return getTCGMarketPrice(card_id, condition);
  }
  
  // Calculate percentiles
  const p25 = percentile(comps, 0.25);
  const p50 = percentile(comps, 0.50); // median
  const p75 = percentile(comps, 0.75);
  
  // Apply intent
  switch (intent) {
    case 'quick_sale':
      return p25 * 0.95; // 5% below 25th percentile
    case 'max_profit':
      return p75 * 1.05; // 5% above 75th percentile
    case 'market_rate':
    default:
      return p50; // Median price
  }
}
```

#### 15.5 UI Integration

**Listing Creation:**
- Show suggested price with confidence indicator
- Display recent comps in a chart
- Show price range (low, median, high)
- Allow seller to override

**Market Insights:**
- "Your price is 12% below market average - could sell faster"
- "This card is trending up (+8% this week)"
- "Similar condition sold for £45-£52 in last 7 days"

**Buyer View:**
- Show if price is good deal vs market
- Display pricing trend graph
- Show recently sold comps

---

## 16. Bundles and Extras

### Objective
Support selling multiple cards together with accessories like sleeves and toploaders.

### Requirements

#### 16.1 Bundle Creation Flow

**UI Steps:**
1. Click "Create Bundle" on seller dashboard
2. Search and select cards from inventory
3. Add quantity for each card
4. Add extras (sleeves, toploaders, storage boxes)
5. Set bundle price (auto-suggests based on individual values)
6. Set shipping (calculated by total weight)
7. Upload bundle photo
8. Publish bundle

#### 16.2 Data Structure

```sql
CREATE TABLE bundles (
  id UUID PRIMARY KEY,
  seller_id UUID REFERENCES profiles(id),
  title VARCHAR(255),
  description TEXT,
  base_price DECIMAL(10,2),
  discount_percentage DECIMAL(5,2),
  final_price DECIMAL(10,2),
  items JSONB, -- Array of listing IDs with quantities
  extras JSONB, -- Array of extras with quantities
  total_cards INTEGER,
  total_weight DECIMAL(10,2), -- grams
  shipping_cost DECIMAL(10,2),
  images TEXT[],
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bundle_extras (
  id UUID PRIMARY KEY,
  name VARCHAR(100),
  type VARCHAR(50), -- sleeve, toploader, binder, box
  price DECIMAL(10,2),
  weight DECIMAL(10,2), -- grams
  image_url TEXT
);
```

#### 16.3 Pricing Logic

**Auto-Suggestion Algorithm:**
```typescript
function calculateBundlePrice(items: BundleItem[], extras: Extra[]) {
  // Sum individual card prices
  const cardsTotal = items.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);
  
  // Sum extras
  const extrasTotal = extras.reduce((sum, extra) => {
    return sum + (extra.price * extra.quantity);
  }, 0);
  
  // Apply bundle discount (5-15% based on quantity)
  const totalCards = items.reduce((sum, item) => sum + item.quantity, 0);
  let discount = 0.05; // 5% base
  if (totalCards >= 10) discount = 0.10;
  if (totalCards >= 25) discount = 0.15;
  
  const subtotal = cardsTotal + extrasTotal;
  const finalPrice = subtotal * (1 - discount);
  
  return {
    base_price: subtotal,
    discount_percentage: discount * 100,
    final_price: finalPrice,
    savings: subtotal - finalPrice
  };
}
```

#### 16.4 Shipping Calculation

**Weight-Based:**
- Average card: 1.8g
- Sleeve: 0.5g
- Toploader: 5g
- Calculate total weight
- Use carrier rate tables
- Add packaging weight (50g bubble mailer or box)

**Example:**
```
20 cards × 1.8g = 36g
20 sleeves × 0.5g = 10g
20 toploaders × 5g = 100g
Packaging = 50g
Total = 196g → Royal Mail Letter rate
```

#### 16.5 Bundle Types

**Pre-Built Bundles:**
- "Starter Pack" (10 common cards + sleeves)
- "Rare Bundle" (5 rare cards + toploaders)
- "Set Complete" (Full set in binder)

**Custom Bundles:**
- Seller selects any combination
- AI suggests complementary cards
- Show bundle value vs individual purchase

#### 16.6 UI Components

**BundleCard:**
- Thumbnail showing all cards
- Card count badge
- Price with savings percentage
- "X cards + extras" label

**BundleDetail:**
- Expandable list of included cards
- Extras list
- Price breakdown
- Savings calculation
- Single "Add to Cart" button

---

## Summary

This document defines **16 major feature systems** for 6Seven, each with detailed requirements, data schemas, processing logic, and UI specifications.

All features are designed to work together as a cohesive AI-native trading marketplace.

**Next Steps:**
1. Review Technical Blueprint for implementation architecture
2. Review Implementation Roadmap for phased delivery
3. Begin development following Cursor task breakdown

**Document Status:** ✅ Complete  
**Last Updated:** 2025-11-19  
**Next Review:** After phase 1 implementation
