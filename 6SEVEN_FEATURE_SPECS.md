# 6Seven - Actual Implementation Specifications

**Last Updated:** 2025-01-25  
**Status:** ✅ Reflects actual codebase implementation  
**Purpose:** This document describes what has actually been built, not what was planned.

---

## Table of Contents

1. [Application Routes & Pages](#1-application-routes--pages)
2. [Core Features Implemented](#2-core-features-implemented)
3. [Database Schema](#3-database-schema)
4. [Backend Functions (Supabase Edge Functions)](#4-backend-functions)
5. [UI Components](#5-ui-components)
6. [Integration Points](#6-integration-points)

---

## 1. Application Routes & Pages

### Public Pages
- **`/`** - Index/Home page with buyer onboarding
- **`/browse`** - Browse listings with filters, semantic search, vibe search
- **`/listing/:id`** - Listing detail page
- **`/bundle/:id`** - Bundle detail page
- **`/bundles`** - Browse bundles
- **`/seller/:sellerId`** - Public seller profile page
- **`/changelog`** - Product changelog
- **`/docs/mcp`** - MCP documentation

### Legal & Help Pages
- **`/terms`** - Terms of Service
- **`/privacy`** - Privacy Policy
- **`/returns`** - Return Policy
- **`/cookies`** - Cookie Policy
- **`/help`** - Help center

### Buyer Pages
- **`/checkout/:id`** - Checkout page
- **`/orders`** - Order history and management
- **`/messages`** - Messaging system
- **`/saved`** - Saved listings
- **`/wallet`** - Wallet management (deposit, withdraw, transactions)
- **`/trade-offers`** - Trade offers management
- **`/membership`** - Membership/subscription management
- **`/settings/notifications`** - Notification preferences
- **`/settings/api-keys`** - API key management

### Seller Pages
- **`/sell`** - Create new listing (with AI features, variant support)
- **`/edit-listing/:id`** - Edit existing listing
- **`/dashboard/seller`** - Seller dashboard
- **`/seller/onboarding`** - Seller onboarding flow
- **`/seller/account`** - Seller account management
- **`/seller/analytics`** - Seller analytics
- **`/seller/reputation`** - Seller reputation dashboard
- **`/seller/automation`** - Auto-relist rules
- **`/seller/verification`** - Seller verification
- **`/seller/profile/settings`** - Seller profile settings

### Admin Pages
- **`/admin`** - Admin dashboard
- **`/admin/analytics`** - Admin analytics
- **`/admin/live`** - Admin live stats
- **`/admin/disputes`** - Dispute management
- **`/admin/restore-cards`** - Card restoration tools
- **`/admin/shipping`** - Shipping management
- **`/admin/moderation`** - Moderation dashboard
- **`/admin/fraud`** - Fraud dashboard

---

## 2. Core Features Implemented

### 2.1 Listing Management

#### Listing Creation (`/sell`)
- **Multi-variant support** - Create multiple variants (conditions, quantities) in one listing
- **AI-powered features:**
  - Auto-list from photos (`ai-auto-list-from-photos`)
  - AI description generation (`ai-generate-description`)
  - AI price suggestions (`ai-price-suggestion`, `suggest-listing-price`)
  - Image analysis (`ai-analyse-images`, `analyze-listing-images`)
  - Photo quality feedback
- **Card search integration** - MagicCardSearch component for Pokémon TCG
- **Media support:**
  - Multiple images (up to 12)
  - Video upload support
  - Image upload progress tracking
- **Shipping configuration:**
  - UK, Europe, International shipping costs
  - Free shipping option
  - Package weight and dimensions
  - Estimated delivery days
- **Trade enablement** - Toggle trade offers on/off
- **AI Answer Engines** - Toggle AI-powered Q&A on listings
- **Category/Subcategory** - Trading Cards, Sealed Products, Accessories, Collectibles, Other

#### Listing Display
- **Browse page** (`/browse`):
  - Filter by category, subcategory, condition, price, brand, size, color, material, set code, rarity
  - Semantic search
  - Vibe search (natural language)
  - Sort by relevance, price, newest, popular
  - Pagination (24 items per page)
  - Marketplace switching (UK/US)
- **Listing detail** (`/listing/:id`):
  - Image gallery with lightbox
  - Video player
  - Seller profile link
  - Trade offer button
  - Save listing
  - Share functionality
  - AI-generated Q&A section

### 2.2 Wallet System

**Implemented Tables:**
- `wallet_accounts` - User wallet balances
- `wallet_transactions` - Transaction history
- `wallet_deposits` - Deposit records
- `wallet_withdrawals` - Withdrawal records
- `wallet_settlements` - Seller earnings settlements

**Features:**
- Deposit money via Stripe
- Withdraw to bank account
- Internal transfers between users
- Wallet balance display
- Transaction history
- Pending balance tracking
- Credit balance system (`credit-check-balance`, `credit-activate-promo`)

**Edge Functions:**
- `wallet-deposit` - Process deposits
- `wallet-withdraw` - Process withdrawals
- `wallet-transfer` - Internal transfers
- `wallet-settlement` - Seller payout settlements
- `wallet-purchase` - Purchase using wallet

### 2.3 Trade System

**Implemented Tables:**
- `trade_offers` - Trade offer records
- Trade items stored as JSONB
- AI fairness scoring
- Counter-offer support

**Features:**
- Create trade offers with cash + items
- AI trade valuation (`trade-valuation`)
- AI fairness scoring (`trade-fairness`)
- Counter-offer flow (`trade-counter`)
- Accept/reject trade offers (`trade-accept`, `trade-reject`)
- Trade completion (`trade-complete`)
- Trade recommendations (`trade-recommendations`)

**Edge Functions:**
- `trade-create` - Create trade offer
- `trade-valuation` - AI valuation of trade items
- `trade-fairness` - Calculate fairness score
- `trade-counter` - Create counter-offer
- `trade-accept` - Accept trade offer
- `trade-reject` - Reject trade offer
- `trade-complete` - Complete trade transaction

### 2.4 Order Management

**Implemented Tables:**
- `orders` - Order records
- `order_items` - Order line items
- `payments` - Payment records
- `payouts` - Seller payouts
- `seller_balances` - Seller balance tracking

**Features:**
- Checkout flow (`/checkout/:id`)
- Stripe payment integration
- Wallet + Stripe split payments
- Order status tracking
- Shipping status updates
- Order history (`/orders`)
- Mark order as delivered
- Refund processing (`process-refund`, `admin-refund`)

**Edge Functions:**
- `create-checkout` - Create checkout session
- `process-refund` - Process refunds
- `admin-refund` - Admin refund processing
- `update-order-shipping` - Update shipping info
- `mark-order-delivered` - Mark order delivered
- `trigger-payout-on-delivery` - Auto-payout on delivery

### 2.5 Shipping Integration

**Carrier:** SendCloud (primary integration)

**Implemented Features:**
- Address validation (`sendcloud-validate-address`)
- Rate calculation (`sendcloud-get-rates`, `shipping-calc-rates`)
- Label creation (`sendcloud-create-label`, `shipping-create-label`)
- Bulk label creation (`sendcloud-bulk-labels`)
- Service point picker
- Return labels (`sendcloud-return-label`)
- Webhook handling (`sendcloud-webhook`, `shipping-tracking-webhook`)
- Manual carrier selection (Royal Mail, DPD, DHL, UPS, FedEx, Evri/Hermes, Yodel, Other)

**Tables:**
- `shipping_labels` - Shipping label records
- `shipping_events` - Tracking events
- `shipping_details` - Detailed shipping info

**Edge Functions:**
- `sendcloud-validate-address` - Validate shipping addresses
- `sendcloud-get-rates` - Get shipping rates
- `sendcloud-create-label` - Create shipping label
- `sendcloud-bulk-labels` - Bulk label creation
- `sendcloud-return-label` - Create return label
- `sendcloud-service-points` - Get service point locations
- `sendcloud-webhook` - Handle SendCloud webhooks
- `shipping-cost-calculator` - Calculate shipping costs
- `shipping-create-label` - Generic label creation
- `shipping-calc-rates` - Generic rate calculation
- `shipping-tracking-webhook` - Track shipping updates

### 2.6 Reviews & Ratings

**Implemented Tables:**
- `ratings` - Rating records (buyer_to_seller, seller_to_buyer)
- Review images support
- Verified purchase badges

**Features:**
- 5-star rating system
- Written reviews with images
- Buyer reviews seller
- Seller reviews buyer
- Review display (`ReviewCard`, `ReviewList`)
- Seller response to reviews (`SellerReviewResponseDialog`)
- Verified purchase indicator

**Components:**
- `RatingDialog` - Submit rating/review
- `ReviewCard` - Display review
- `ReviewList` - List of reviews
- `SellerReviewResponseDialog` - Seller response

### 2.7 Dispute Resolution

**Implemented Tables:**
- `disputes` - Dispute records
- AI summary and recommendations
- Evidence upload (JSONB)

**Dispute Types:**
- item_not_received
- item_not_as_described
- damaged
- counterfeit
- other

**Status Flow:**
- open → under_review → resolved/closed/escalated

**Features:**
- Create dispute (`DisputeForm`, `DisputeDialog`)
- AI auto-summarization (`dispute-auto-summarizer`)
- Admin dispute management (`/admin/disputes`)
- SLA monitoring (`dispute-sla-monitor`)
- Evidence upload
- Admin resolution workflow

**Edge Functions:**
- `dispute-auto-summarizer` - AI dispute analysis
- `dispute-sla-monitor` - Monitor dispute SLAs

### 2.8 Messaging System

**Features:**
- Real-time messaging
- File attachments
- Image lightbox
- Typing indicators
- Read receipts
- Message reactions
- Message search
- Reply suggestions (`message-reply-helper`)
- Safety scanning (`message-safety-scanner`)
- Sentiment analysis (`message-sentiment-analyzer`)

**Components:**
- `ConversationItem` - Conversation list item
- `MessageAttachments` - File/image attachments
- `TypingIndicator` - Typing status
- `ReadReceipt` - Read status
- `MessageReactions` - Emoji reactions
- `MessageSearch` - Search messages
- `ImageLightbox` - Image viewer

### 2.9 AI Features

#### AI Listing Features
- **Auto-list from photos** (`ai-auto-list-from-photos`)
- **AI description generation** (`ai-generate-description`)
- **AI price suggestions** (`ai-price-suggestion`, `suggest-listing-price`)
- **Image analysis** (`ai-analyse-images`, `analyze-listing-images`)
- **Fake card detection** (`fake-card-scan`, `fake-card-video-request`, `fake-card-review`)
- **Listing embedding generation** (`generate-listing-embedding`)

#### AI Search Features
- **Semantic search** (`semantic-search`)
- **Keyword search** (`keyword-search`)
- **Vibe search** (`vibe-search`)
- **Image search** (`image-search`)
- **Search autocomplete** (`search-autocomplete`)

#### AI Seller Tools
- **Seller Copilot** (`seller-copilot`)
  - Photo advisor (`seller-copilot-photo-advisor`)
  - Stale inventory detector (`seller-copilot-stale-detector`)
  - Tag optimizer (`seller-copilot-tag-optimizer`)
- **Stale inventory alerts** (`stale-inventory-detector`)

#### AI Buyer Tools
- **Buyer agent recommendations** (`buyer-agent-recommendations`)
- **Price drop detector** (`buyer-agent-price-drop-detector`)
- **Bundle suggester** (`buyer-agent-bundle-suggester`)
- **Learning system** (`buyer-agent-learn`)

#### AI Moderation
- **Content safety** (`moderation-content-safety`)
- **Auto-classifier** (`moderation-auto-classifier`)
- **Message safety scanner** (`message-safety-scanner`)

### 2.10 ACP (Agentic Commerce Protocol)

**Implemented Endpoints:**
- `GET /acp/products` - List products (`acp-products`)
- `GET /acp/product/:id` - Get product detail (`acp-product`)
- `POST /acp/checkout` - Create checkout (`acp-checkout`)
- `POST /acp/payment` - Process payment (`acp-payment`)
- `POST /acp/confirm` - Confirm order (`acp-confirm`)

**Tables:**
- `acp_sessions` - ACP session tracking
- `api_keys` - API key management

**Features:**
- API key authentication
- Agent-friendly endpoints
- Session management
- Full checkout flow for agents

### 2.11 MCP (Model Context Protocol)

**Implemented Tools:**
- `search_listings` - Search marketplace
- `get_listing` - Get listing details
- `create_listing` - Create new listing
- `update_listing` - Update listing
- `evaluate_price` - Get price suggestions
- `auto_list_from_photos` - Auto-create from photos
- `submit_trade_offer` - Create trade offer
- `purchase_item` - Buy listing
- `get_wallet_balance` - Check wallet
- `deposit` - Add money to wallet
- `withdraw` - Withdraw from wallet
- `ai_detect_fake` - Fake card detection
- `list_inventory` - Get user inventory

**Edge Functions:**
- `mcp-server` - Main MCP server
- `mcp-search` - Search implementation
- `mcp-get-listing` - Get listing
- `mcp-create-listing` - Create listing
- `mcp-update-listing` - Update listing
- `mcp-evaluate-price` - Price evaluation
- `mcp-auto-list` - Auto-listing
- `mcp-trade-offer` - Trade offers
- `mcp-buy` - Purchase flow
- `mcp-wallet` - Wallet operations
- `mcp-detect-fake` - Fake detection
- `mcp-list-inventory` - Inventory management

### 2.12 Bundles

**Implemented Tables:**
- `bundles` - Bundle records
- `bundle_items` - Bundle contents (via JSONB or separate table)

**Features:**
- Create bundles (`bundle-create`)
- Bundle pricing (`bundle-pricing`)
- Bundle display (`/bundles`, `/bundle/:id`)
- Bundle recommendations

**Edge Functions:**
- `bundle-create` - Create bundle
- `bundle-pricing` - Calculate bundle pricing

### 2.13 Seller Features

#### Seller Dashboard
- Listings management
- Order management
- Analytics overview
- Balance cards
- Credits banner
- Stale inventory alerts

#### Seller Analytics
- Sales metrics
- Performance tracking
- Revenue charts
- Listing performance
- (`collect-seller-analytics`, `seller-analytics`)

#### Seller Reputation
- Trust score calculation (`calculate-trust-score`)
- Reputation dashboard
- Badge system (`calculate-seller-badges`, `assign-seller-badge`)
- Risk tier calculation (`calculate-risk-tiers`)
- Daily reputation calculation (`daily-reputation-calculation`)

#### Seller Verification
- Email verification
- Phone verification (`send-phone-verification`, `verify-phone-code`)
- ID verification
- Business verification
- Verification requirements display

#### Seller Onboarding
- Step-by-step onboarding
- Stripe Connect integration (`stripe-connect-onboard`, `stripe-connect-onboard-complete`)
- Account session management (`stripe-connect-account-session`)
- Requirements checking (`stripe-connect-requirements`)

#### Auto-Relist Rules
- Automated relisting (`auto-relist-executor`)
- Rule configuration (`/seller/automation`)

### 2.14 Admin Features

#### Admin Dashboard
- Overview metrics
- Quick actions

#### Admin Analytics
- Platform-wide analytics (`admin-analytics`)
- User analytics
- Sales analytics

#### Admin Live Stats
- Real-time platform stats (`admin-live-stats`)
- Active users
- Current transactions

#### Dispute Management
- View all disputes (`/admin/disputes`)
- Resolve disputes
- AI-assisted resolution
- SLA monitoring

#### Moderation Dashboard
- Content moderation queue
- User reports
- AI classification
- Manual review tools

#### Fraud Dashboard
- Fraud detection (`fraud-duplicate-detector`, `fraud-image-forensics`)
- Risk scoring
- Fraud scan scheduling (`fraud-scan-scheduler`)

#### Shipping Management
- Shipping label management
- Carrier configuration
- Bulk operations

#### Card Restoration
- Restore deleted cards
- Data recovery tools

### 2.15 Pokémon TCG Integration

**Implemented Tables:**
- `pokemon_card_attributes` - Card metadata
- `pricing_comps` - Pricing comparisons
- `market_prices` - Market price data

**Features:**
- Card data sync (`import-all-pokemon`, `import-pokemon-tcg-sv4a`, `import-tcgdex-data`, `import-tcgdex-github`, `import-tcgdex-set`, `import-github-pokemon-data`, `import-github-tcg-data`, `sync-tcg-data`, `sync-justtcg-data`)
- Card search (`pokemon-search`)
- Set completeness verification (`verify-set-completeness`)
- Printed totals population (`populate-printed-totals`)
- Image backfilling (`backfill-sv4a-images`, `import-sv4a-images`)
- Missing card imports (`import-missing-sv4a-cards`)
- Japanese card restoration (`restore-japanese-cards`)

**Edge Functions:**
- `import-all-pokemon` - Import all Pokémon cards
- `import-pokemon-tcg-sv4a` - Import SV4A set
- `import-tcgdex-data` - Import from TCGdex
- `import-tcgdex-github` - Import from TCGdex GitHub
- `import-tcgdex-set` - Import specific set
- `import-github-pokemon-data` - Import from GitHub
- `import-github-tcg-data` - Import TCG data from GitHub
- `sync-tcg-data` - Sync TCG data
- `sync-justtcg-data` - Sync JustTCG data
- `pokemon-search` - Search Pokémon cards
- `verify-set-completeness` - Verify set completeness
- `populate-printed-totals` - Populate printed totals
- `backfill-sv4a-images` - Backfill SV4A images
- `import-sv4a-images` - Import SV4A images
- `import-missing-sv4a-cards` - Import missing SV4A cards
- `restore-japanese-cards` - Restore Japanese cards

### 2.16 Pricing & Market Data

**Features:**
- Pricing comp ingestion (`ingest-comp-data`)
- Market analysis (`market-analysis`)
- Price drop notifications (`price-drop-notifier`)
- Price suggestions based on comps

**Edge Functions:**
- `ingest-comp-data` - Ingest pricing comparison data
- `market-analysis` - Market analysis
- `price-drop-notifier` - Notify on price drops

### 2.17 Notifications

**Features:**
- Email notifications (`send-email-notification`, `send-verification-email`)
- Push notifications (`send-notification`)
- Shipping notifications (`send-shipping-notification`)
- Notification preferences (`/settings/notifications`)
- Notification center component

**Edge Functions:**
- `send-email-notification` - Send email
- `send-verification-email` - Send verification email
- `send-notification` - Send push notification
- `send-shipping-notification` - Shipping update notification
- `send-phone-verification` - Send phone verification
- `admin-send-test-email` - Admin test email

### 2.18 User Management

**Features:**
- User profiles with avatars (`AvatarUpload`)
- Email verification
- Phone verification
- KYC status
- Trust scores
- User roles (buyer, seller, admin, moderator)
- User preferences
- Saved listings
- Saved searches
- Search history

**Tables:**
- `profiles` - User profiles
- `user_roles` - Role assignments
- `user_preferences` - User preferences
- `saved_listings` - Saved listings
- `notification_preferences` - Notification settings

### 2.19 Membership System

**Implemented Tables:**
- `user_memberships` - Membership records
- `transaction_fees` - Fee breakdown

**Features:**
- Membership tiers (free, pro, enterprise)
- Stripe subscription integration
- Promo user support
- GMV tracking
- Fee calculation

**Edge Functions:**
- `check-subscription` - Check subscription status
- `customer-portal` - Stripe customer portal

### 2.20 Analytics & Tracking

**Features:**
- User session tracking (`track-user-session`)
- Seller analytics collection
- Admin analytics
- Platform metrics
- Performance monitoring

**Edge Functions:**
- `track-user-session` - Track user sessions
- `collect-seller-analytics` - Collect seller analytics
- `admin-analytics` - Admin analytics
- `admin-live-stats` - Live platform stats

### 2.21 Import/Export Tools

**Features:**
- CSV import (`CsvUploader`)
- Collectr portfolio import (`import-collectr-portfolio`, `CollectrImportDialog`)
- Import progress tracking (`ImportProgress`)
- Import summary (`ImportSummary`)
- Portfolio URL input (`PortfolioUrlInput`)

**Edge Functions:**
- `import-collectr-portfolio` - Import from Collectr

### 2.22 Additional Features

- **Auto-relist rules** - Automated listing management
- **Price drop alerts** - Notify users of price changes
- **Saved searches** - Save search criteria
- **Search history** - Track search queries
- **Image quality feedback** - AI-powered photo suggestions
- **Listing URL generation** - SEO-friendly URLs
- **View transitions** - Smooth page transitions
- **Mobile detection** - Responsive design
- **Browser notifications** - Web push notifications
- **Address validation** - Shipping address validation
- **Mapbox integration** - Map services (`mapbox-public-token`)

---

## 3. Database Schema

### Core Tables

#### User & Authentication
- `profiles` - User profiles (extends auth.users)
- `user_roles` - User role assignments
- `user_preferences` - User preferences
- `user_memberships` - Membership subscriptions
- `api_keys` - API key management

#### Listings
- `listings` - Product listings
- `listing_images` - Listing images
- `listing_media` - Media files (images/videos)
- `saved_listings` - User saved listings
- `pokemon_card_attributes` - Pokémon card metadata
- `pricing_comps` - Pricing comparisons
- `market_prices` - Market price data

#### Orders & Payments
- `orders` - Order records
- `order_items` - Order line items
- `payments` - Payment records
- `payouts` - Seller payouts
- `seller_balances` - Seller balance tracking
- `transaction_fees` - Fee breakdown

#### Wallet System
- `wallet_accounts` - Wallet accounts
- `wallet_transactions` - Transaction history
- `wallet_deposits` - Deposit records
- `wallet_withdrawals` - Withdrawal records
- `wallet_settlements` - Seller settlements

#### Trade System
- `trade_offers` - Trade offer records
- Trade items stored as JSONB in trade_offers

#### Shipping
- `shipping_labels` - Shipping label records
- `shipping_events` - Tracking events
- `shipping_details` - Detailed shipping info

#### Reviews & Ratings
- `ratings` - Rating/review records
- Review images stored in ratings table

#### Disputes & Moderation
- `disputes` - Dispute records
- `reports` - User reports
- `moderation_queue` - Moderation queue

#### Messaging
- `conversations` - Conversation records
- `messages` - Message records
- Message attachments stored in messages table

#### Bundles
- `bundles` - Bundle records
- Bundle items referenced via listings.bundle_id

#### ACP
- `acp_sessions` - ACP session tracking

#### Seller Features
- `seller_risk_ratings` - Risk tier calculations
- `seller_badges` - Seller badge assignments
- `seller_reputation` - Reputation scores

#### Analytics
- `buyer_agent_activities` - Buyer agent activity tracking
- `buyer_agent_feedback` - Agent feedback
- Various analytics tables

#### Support
- `support_tickets` - Support ticket system
- `notifications` - Notification records

### Enums

- `user_role` - buyer, seller, admin, moderator
- `listing_status` - draft, pending_review, active, reserved, sold, cancelled, disputed
- `condition_type` - new_with_tags, like_new, excellent, good, fair
- `membership_tier` - free, pro, enterprise
- `risk_tier` - A, B, C
- `marketplace_type` - UK, US (and others)

---

## 4. Backend Functions

### ACP Functions
- `acp-products` - List products
- `acp-product` - Get product detail
- `acp-checkout` - Create checkout
- `acp-payment` - Process payment
- `acp-confirm` - Confirm order

### MCP Functions
- `mcp-server` - Main MCP server
- `mcp-search` - Search listings
- `mcp-get-listing` - Get listing
- `mcp-create-listing` - Create listing
- `mcp-update-listing` - Update listing
- `mcp-evaluate-price` - Price evaluation
- `mcp-auto-list` - Auto-list from photos
- `mcp-trade-offer` - Trade offers
- `mcp-buy` - Purchase flow
- `mcp-wallet` - Wallet operations
- `mcp-detect-fake` - Fake detection
- `mcp-list-inventory` - Inventory management

### AI Functions
- `ai-auto-list-from-photos` - Auto-create listing from photos
- `ai-generate-description` - Generate listing description
- `ai-price-suggestion` - Suggest pricing
- `ai-analyse-images` - Analyze images
- `analyze-listing-images` - Analyze listing images
- `fake-card-scan` - Scan for fake cards
- `fake-card-video-request` - Request verification video
- `fake-card-review` - Review fake card detection
- `generate-listing-embedding` - Generate embeddings

### Search Functions
- `semantic-search` - Semantic search
- `keyword-search` - Keyword search
- `vibe-search` - Vibe/natural language search
- `image-search` - Image-based search
- `search-autocomplete` - Search autocomplete
- `pokemon-search` - Pokémon card search

### Wallet Functions
- `wallet-deposit` - Process deposits
- `wallet-withdraw` - Process withdrawals
- `wallet-transfer` - Internal transfers
- `wallet-settlement` - Seller settlements
- `wallet-purchase` - Purchase using wallet
- `credit-check-balance` - Check credit balance
- `credit-activate-promo` - Activate promo credits

### Trade Functions
- `trade-create` - Create trade offer
- `trade-valuation` - AI valuation
- `trade-fairness` - Fairness scoring
- `trade-counter` - Counter-offer
- `trade-accept` - Accept offer
- `trade-reject` - Reject offer
- `trade-complete` - Complete trade
- `trade-recommendations` - Trade recommendations
- `admin-trade-review` - Admin trade review

### Order Functions
- `create-checkout` - Create checkout session
- `process-refund` - Process refunds
- `admin-refund` - Admin refund processing
- `update-order-shipping` - Update shipping
- `mark-order-delivered` - Mark delivered
- `trigger-payout-on-delivery` - Auto-payout

### Shipping Functions
- `sendcloud-validate-address` - Validate address
- `sendcloud-get-rates` - Get rates
- `sendcloud-create-label` - Create label
- `sendcloud-bulk-labels` - Bulk labels
- `sendcloud-return-label` - Return label
- `sendcloud-service-points` - Service points
- `sendcloud-webhook` - Webhook handler
- `shipping-cost-calculator` - Calculate costs
- `shipping-create-label` - Generic label creation
- `shipping-calc-rates` - Generic rate calc
- `shipping-tracking-webhook` - Tracking webhook

### Seller Functions
- `seller-copilot` - Seller AI assistant
- `seller-copilot-photo-advisor` - Photo advice
- `seller-copilot-stale-detector` - Stale detection
- `seller-copilot-tag-optimizer` - Tag optimization
- `collect-seller-analytics` - Collect analytics
- `seller-analytics` - Seller analytics
- `calculate-seller-reputation` - Reputation calc
- `calculate-seller-badges` - Badge calculation
- `assign-seller-badge` - Assign badge
- `calculate-trust-score` - Trust score
- `calculate-risk-tiers` - Risk calculation
- `daily-reputation-calculation` - Daily rep calc
- `stale-inventory-detector` - Stale detection

### Admin Functions
- `admin-analytics` - Admin analytics
- `admin-live-stats` - Live stats
- `admin-refund` - Refund processing
- `admin-flag` - Flag users/content
- `admin-dispute-summary` - Dispute summary
- `admin-send-test-email` - Test email
- `admin-trade-review` - Trade review

### Moderation Functions
- `moderation-content-safety` - Content safety
- `moderation-auto-classifier` - Auto-classify
- `message-safety-scanner` - Message safety
- `message-sentiment-analyzer` - Sentiment analysis

### Fraud Functions
- `fraud-duplicate-detector` - Duplicate detection
- `fraud-image-forensics` - Image forensics
- `fraud-scan-scheduler` - Scan scheduling

### Dispute Functions
- `dispute-auto-summarizer` - AI summarization
- `dispute-sla-monitor` - SLA monitoring

### Messaging Functions
- `message-reply-helper` - Reply suggestions

### Buyer Agent Functions
- `buyer-agent-recommendations` - Recommendations
- `buyer-agent-price-drop-detector` - Price drops
- `buyer-agent-bundle-suggester` - Bundle suggestions
- `buyer-agent-learn` - Learning system

### Pricing Functions
- `suggest-listing-price` - Price suggestion
- `ingest-comp-data` - Ingest comps
- `market-analysis` - Market analysis
- `price-drop-notifier` - Price drop alerts

### Bundle Functions
- `bundle-create` - Create bundle
- `bundle-pricing` - Calculate pricing

### Import Functions
- `import-all-pokemon` - Import all Pokémon
- `import-pokemon-tcg-sv4a` - Import SV4A
- `import-tcgdex-data` - Import TCGdex
- `import-tcgdex-github` - Import from GitHub
- `import-tcgdex-set` - Import set
- `import-github-pokemon-data` - Import Pokémon data
- `import-github-tcg-data` - Import TCG data
- `sync-tcg-data` - Sync TCG data
- `sync-justtcg-data` - Sync JustTCG
- `import-missing-sv4a-cards` - Import missing
- `restore-japanese-cards` - Restore Japanese
- `import-collectr-portfolio` - Import Collectr
- `backfill-sv4a-images` - Backfill images
- `import-sv4a-images` - Import images
- `populate-printed-totals` - Populate totals
- `verify-set-completeness` - Verify sets

### Utility Functions
- `calculate-fees` - Calculate fees
- `auto-relist-executor` - Auto-relist
- `send-email-notification` - Send email
- `send-verification-email` - Verification email
- `send-notification` - Push notification
- `send-shipping-notification` - Shipping notification
- `send-phone-verification` - Phone verification
- `verify-phone-code` - Verify phone
- `api-key-generate` - Generate API key
- `api-key-manage` - Manage API keys
- `check-subscription` - Check subscription
- `customer-portal` - Customer portal
- `stripe-connect-onboard` - Stripe onboarding
- `stripe-connect-onboard-complete` - Complete onboarding
- `stripe-connect-account-session` - Account session
- `stripe-connect-requirements` - Check requirements
- `stripe-webhook` - Stripe webhook
- `track-user-session` - Session tracking
- `validate-card-images` - Validate images
- `mapbox-public-token` - Mapbox token
- `outfit-builder` - Outfit builder (legacy?)
- `portfolio-optimizer` - Portfolio optimization
- `scrape-pokellector` - Scrape Pokellector

---

## 5. UI Components

### Navigation
- `Navigation` - Main navigation
- `DesktopNav` - Desktop navigation
- `MobileMenu` - Mobile menu
- `NavLink` - Navigation link

### Layout
- `PageLayout` - Page wrapper
- `PageTransition` - Page transitions
- `Footer` - Site footer
- `ErrorBoundary` - Error handling
- `ErrorDisplay` - Error display

### Listing Components
- `ListingCard` - Listing card
- `ListingCardSkeleton` - Loading skeleton
- `QuickListModal` - Quick list creation
- `EditListingImageManager` - Image management
- `PhotoUploadProgress` - Upload progress
- `VideoListingPlayer` - Video player
- `AIGeneratedPreview` - AI preview
- `AIAnswerEnginesToggle` - AI toggle
- `BulkPurchaseDialog` - Bulk purchase
- `BundleCreator` - Bundle creation
- `MagicCardSearch` - Card search

### Browse & Search
- `SearchFilters` - Search filters
- `VibeSearchDialog` - Vibe search
- `ImageSearchDialog` - Image search
- `SavedSearchesPanel` - Saved searches
- `SearchHistoryPanel` - Search history

### Seller Components
- `SellerDashboard` - Dashboard
- `ListingsManagement` - Listings
- `BalanceCards` - Balance display
- `CreditsBanner` - Credits banner
- `PayoutHistory` - Payout history
- `PayoutSchedule` - Payout schedule
- `SellerBadges` - Badge display
- `SellerReputation` - Reputation
- `TrustScore` - Trust score
- `ReputationDashboard` - Rep dashboard
- `OnboardingSteps` - Onboarding
- `OnboardingStatusCards` - Status cards
- `VerificationRequirements` - Verification
- `VariantManager` - Variant management
- `SellerCopilot` - AI assistant
- `StaleInventoryAlert` - Stale alerts

### Buyer Components
- `BuyerOnboarding` - Onboarding
- `PriceDropAlerts` - Price alerts
- `BundleRecommendation` - Bundle suggestions

### Trade Components
- `OfferCard` - Offer display
- `OfferDialog` - Offer dialog
- `CounterOfferDialog` - Counter-offer
- `OfferExpirationTimer` - Expiration
- `OfferManagementCard` - Management
- Trade-related components in `trade/` directory

### Messaging Components
- `ConversationItem` - Conversation list
- `ConversationMenu` - Conversation menu
- `FileUpload` - File upload
- `ImageLightbox` - Image viewer
- `MessageActions` - Message actions
- `MessageAttachments` - Attachments
- `MessageReactions` - Reactions
- `MessageSearch` - Search
- `ReadReceipt` - Read status
- `TypingIndicator` - Typing
- `MessageReplySuggestions` - Reply suggestions
- `MessageSafetyIndicator` - Safety indicator

### Review Components
- `RatingDialog` - Submit rating
- `ReviewCard` - Review display
- `ReviewList` - Review list
- `SellerReviewResponseDialog` - Seller response

### Dispute Components
- `DisputeForm` - Create dispute
- `DisputeDialog` - Dispute dialog
- `DisputeResolutionPanel` - Resolution panel

### Admin Components
- `AdminLayout` - Admin layout
- `AdminOrderView` - Order view
- `AdminUserList` - User list
- `DisputeManager` - Dispute management
- `FakeCardReviewQueue` - Fake card queue
- `RefundProcessor` - Refund processing
- `VideoReviewInterface` - Video review

### Moderation Components
- `ModerationQueue` - Moderation queue
- `ReportDialog` - Report dialog

### Wallet Components
- `WalletBalance` - Balance display
- `WalletDeposit` - Deposit form
- `WalletWithdraw` - Withdraw form
- `WalletTransactions` - Transaction list
- `CreditBalance` - Credit display

### Shipping Components
- `ShipOrderDialog` - Ship order
- `EnhancedShipOrderDialog` - Enhanced ship
- `BulkShippingDialog` - Bulk shipping
- `ServicePointPicker` - Service points
- `ReturnLabelButton` - Return label
- Additional components in `shipping/` directory

### Profile Components
- `AvatarUpload` - Avatar upload

### Import Components
- `CsvUploader` - CSV upload
- `CollectrImportDialog` - Collectr import
- `ImportProgress` - Progress tracking
- `ImportSummary` - Import summary
- `PortfolioUrlInput` - Portfolio URL

### MCP Components
- `MCPAgentDashboard` - Agent dashboard
- `MCPToolTester` - Tool tester

### ACP Components
- `ACPProductList` - Product list
- `ACPCheckout` - Checkout
- `ACPOrderStatus` - Order status

### Utility Components
- `CookieConsent` - Cookie consent
- `EmailVerificationBanner` - Email banner
- `EmailVerificationStatus` - Email status
- `NotificationCenter` - Notifications
- `FraudAlertBanner` - Fraud alert
- `RiskScoreIndicator` - Risk score
- `AgentFeedbackButtons` - Agent feedback
- `AgentInsightsPanel` - Agent insights
- `ImageAnalysisPanel` - Image analysis
- `PhotoImprovementSuggestions` - Photo tips
- `PhotoQualityFeedback` - Quality feedback
- `AutomationRulesPanel` - Automation rules
- `SEO` - SEO component
- `PrefetchLink` - Prefetch link

### Home Page Components
- `Hero` - Hero section
- `Features` - Features section
- `HowItWorks` - How it works
- `ShowcaseSection` - Showcase
- `AIIntelligenceSection` - AI section
- `MarketplaceSection` - Marketplace section
- `TrustSection` - Trust section

### Skeleton Components
- `PageSkeleton` - Page skeleton
- `ListingSkeleton` - Listing skeleton
- `DashboardSkeleton` - Dashboard skeleton

### UI Components (shadcn/ui)
- 49+ UI components in `ui/` directory (buttons, dialogs, forms, etc.)

---

## 6. Integration Points

### Payment Processing
- **Stripe** - Payment processing, Connect, subscriptions
- **Stripe Connect** - Seller payouts
- **Stripe Customer Portal** - Subscription management

### Shipping
- **SendCloud** - Primary shipping integration
  - Address validation
  - Rate calculation
  - Label creation
  - Service points
  - Return labels
  - Webhooks
- **Manual carriers** - Royal Mail, DPD, DHL, UPS, FedEx, Evri/Hermes, Yodel

### Data Sources
- **Pokémon TCG API** - Card data
- **TCGdex** - Card database
- **JustTCG** - TCG data
- **Collectr** - Portfolio import
- **TCGPlayer** - Pricing data (via comps)
- **eBay** - Pricing data (via comps)

### AI Services
- **OpenAI** - AI features (descriptions, analysis, etc.)
- **Computer Vision** - Image analysis, fake detection
- **Embeddings** - Semantic search

### Maps
- **Mapbox** - Map services

### Authentication
- **Supabase Auth** - User authentication
- **Email verification** - Email verification
- **Phone verification** - Phone verification

### Storage
- **Supabase Storage** - Image/video storage
- **Listing images bucket** - Listing media

### Real-time
- **Supabase Realtime** - Real-time updates (messages, etc.)

---

## Summary

This document reflects the **actual implementation** of 6Seven as of January 2025. The codebase includes:

- **37+ pages/routes**
- **189+ React components**
- **138+ Supabase Edge Functions**
- **98+ database migrations**
- **50+ database tables**
- **Comprehensive feature set** covering:
  - Listing management with AI
  - Wallet system
  - Trade system
  - Order management
  - Shipping integration (SendCloud)
  - Reviews & ratings
  - Dispute resolution
  - Messaging system
  - ACP & MCP protocols
  - Admin tools
  - Seller tools
  - Buyer tools
  - Pokémon TCG integration
  - And much more

**Next Steps:**
1. Use this document as the source of truth for what exists
2. Plan new features based on current implementation
3. Identify gaps between planned and implemented features
4. Update other planning documents to match this reality
