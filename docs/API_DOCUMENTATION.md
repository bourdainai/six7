# Slabz iOS App - API Documentation

## Table of Contents
1. [Supabase Configuration](#supabase-configuration)
2. [Authentication](#authentication)
3. [Database Tables](#database-tables)
4. [Query Patterns](#query-patterns)
5. [Edge Functions](#edge-functions)
6. [Storage Buckets](#storage-buckets)
7. [Real-time Subscriptions](#real-time-subscriptions)
8. [Type Definitions](#type-definitions)

---

## Supabase Configuration

```typescript
// Supabase Client Setup
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ouvrgsvrkjxltbcwvuyz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91dnJnc3Zya2p4bHRiY3d2dXl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxNjIwNDAsImV4cCI6MjA3ODczODA0MH0.ZJm-CVabXEK6QTR1FJAraRebtF6fX-fNkpD5ZcVCMCs';

const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

**Project ID:** `ouvrgsvrkjxltbcwvuyz`

---

## Authentication

### Sign Up
```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
  options: {
    data: {
      full_name: 'John Doe'
    }
  }
});
```

### Sign In
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});
```

### Sign Out
```typescript
const { error } = await supabase.auth.signOut();
```

### Get Current User
```typescript
const { data: { user } } = await supabase.auth.getUser();
```

### Listen to Auth Changes
```typescript
supabase.auth.onAuthStateChange((event, session) => {
  console.log(event, session);
});
```

---

## Database Tables

### profiles
User profile information. Created automatically when a user signs up.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | - | Primary key, matches auth.users.id |
| email | text | Yes | - | User's email address |
| full_name | text | Yes | - | Display name (**NOT username**) |
| avatar_url | text | Yes | - | Profile picture URL |
| bio | text | Yes | - | User biography |
| phone_number | text | Yes | - | Phone number |
| phone_verified | boolean | Yes | false | Phone verification status |
| email_verified | boolean | Yes | false | Email verification status |
| id_verified | boolean | Yes | false | ID verification status |
| business_verified | boolean | Yes | false | Business verification status |
| trust_score | integer | Yes | 50 | Trust score (0-100) |
| country | text | Yes | - | User's country |
| preferred_currency | text | Yes | - | Preferred currency code |
| marketplace | enum | Yes | 'UK' | marketplace_type enum |
| stripe_connect_account_id | text | Yes | - | Stripe Connect account |
| stripe_onboarding_complete | boolean | Yes | false | Stripe setup complete |
| can_receive_payments | boolean | Yes | false | Can receive payouts |
| notification_preferences | jsonb | Yes | {...} | Push/email preferences |
| instagram_url | text | Yes | - | Social media link |
| twitter_url | text | Yes | - | Social media link |
| youtube_url | text | Yes | - | Social media link |
| tiktok_url | text | Yes | - | Social media link |
| avg_response_time_hours | numeric | Yes | - | Average response time |
| is_banned | boolean | Yes | false | Account banned status |
| kyc_status | boolean | Yes | false | KYC verification |
| verification_level | text | Yes | - | 'unverified', 'basic', 'verified', 'premium' |
| created_at | timestamptz | Yes | now() | Creation timestamp |
| updated_at | timestamptz | Yes | now() | Last update timestamp |

**RLS Policies:**
- Anyone can view any profile (SELECT)
- Users can only update their own profile (UPDATE)
- Users can only insert their own profile (INSERT)

---

### listings
Product listings for sale.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | uuid_generate_v4() | Primary key |
| seller_id | uuid | No | - | **References profiles.id (NOT user_id!)** |
| title | text | No | - | Listing title |
| description | text | Yes | - | Listing description |
| seller_price | numeric | No | - | Asking price |
| suggested_price | numeric | Yes | - | AI suggested price |
| quick_sale_price | numeric | Yes | - | Quick sale price |
| ambitious_price | numeric | Yes | - | High-end price |
| original_rrp | numeric | Yes | - | Original retail price |
| currency | text | Yes | 'USD' | Price currency |
| condition | enum | Yes | - | condition_type enum |
| status | enum | Yes | 'draft' | listing_status enum |
| category | text | Yes | - | Category name |
| subcategory | text | Yes | - | Subcategory name |
| brand | text | Yes | - | Brand name |
| card_id | varchar | Yes | - | Pokemon card reference |
| card_number | varchar | Yes | - | Card number |
| set_code | varchar | Yes | - | Pokemon set code |
| marketplace | enum | Yes | 'UK' | marketplace_type |
| accepts_offers | boolean | No | true | Accepts price offers |
| trade_enabled | boolean | Yes | true | Accepts trades |
| free_shipping | boolean | Yes | false | Free shipping flag |
| shipping_cost_uk | numeric | Yes | 0 | UK shipping cost |
| shipping_cost_europe | numeric | Yes | 0 | Europe shipping cost |
| shipping_cost_international | numeric | Yes | 0 | Intl shipping cost |
| estimated_delivery_days | integer | Yes | 3 | Estimated delivery |
| package_weight | numeric | Yes | - | Package weight |
| package_dimensions | jsonb | Yes | - | {length, width, height} |
| views | integer | Yes | 0 | View count |
| saves | integer | Yes | 0 | Save/favorite count |
| has_variants | boolean | Yes | false | Has variant items |
| bundle_type | text | Yes | 'none' | 'none', 'pick_any', 'full' |
| bundle_price | numeric | Yes | - | Bundle price |
| original_bundle_price | numeric | Yes | - | Original bundle price |
| remaining_bundle_price | numeric | Yes | - | Remaining bundle value |
| bundle_discount_percentage | integer | Yes | 0 | Bundle discount % |
| video_url | text | Yes | - | Video URL |
| short_id | text | Yes | - | Short URL ID |
| ai_confidence | jsonb | Yes | {} | AI confidence scores |
| ai_answer_engines_enabled | boolean | Yes | false | AI features enabled |
| style_tags | jsonb | Yes | [] | Style tags array |
| category_attributes | jsonb | Yes | {} | Category-specific attrs |
| portfolio_name | text | Yes | - | Portfolio grouping |
| import_job_id | uuid | Yes | - | Bulk import reference |
| import_metadata | jsonb | Yes | {} | Import metadata |
| search_vector | tsvector | Yes | - | Full-text search |
| stale_risk_score | integer | Yes | 0 | Stale listing score |
| last_view_at | timestamptz | Yes | - | Last viewed |
| published_at | timestamptz | Yes | - | Publish timestamp |
| created_at | timestamptz | Yes | now() | Creation timestamp |
| updated_at | timestamptz | Yes | now() | Last update |

**Enums:**
- `condition_type`: 'mint', 'near_mint', 'excellent', 'good', 'light_play', 'played', 'poor'
- `listing_status`: 'draft', 'active', 'sold', 'reserved', 'deleted'
- `marketplace_type`: 'UK', 'US', 'EU', 'AU', 'JP'

**RLS Policies:**
- Public can view listings where `status = 'active'`
- Sellers can view/edit/delete their own listings (any status)

---

### listing_images
Images for listings.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | uuid_generate_v4() | Primary key |
| listing_id | uuid | No | - | References listings.id |
| image_url | text | No | - | Full image URL |
| display_order | integer | Yes | 0 | Image sort order |
| quality_score | integer | Yes | 0 | AI quality score |
| lighting_score | integer | Yes | 0 | AI lighting score |
| angle_score | integer | Yes | 0 | AI angle score |
| background_score | integer | Yes | 0 | AI background score |
| counterfeit_risk_score | integer | Yes | 0 | Counterfeit risk |
| is_stock_photo | boolean | Yes | false | Stock photo flag |
| item_segmented | boolean | Yes | false | Item segmented |
| damage_detected | jsonb | Yes | [] | Detected damage |
| logo_detected | jsonb | Yes | [] | Detected logos |
| ai_analysis | jsonb | Yes | {} | Full AI analysis |
| created_at | timestamptz | Yes | now() | Creation timestamp |

**RLS Policies:**
- Anyone can view listing images (SELECT)
- Sellers can insert/delete images for their own listings

---

### listing_variants
Variants for listings with multiple items (e.g., bundle picking).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| listing_id | uuid | No | - | References listings.id |
| variant_name | text | No | - | Variant name |
| variant_price | numeric | No | - | Variant price |
| variant_quantity | integer | No | 1 | Available quantity |
| variant_condition | enum | Yes | - | condition_type |
| variant_images | jsonb | Yes | [] | Image URLs array |
| card_id | varchar | Yes | - | Pokemon card reference |
| display_order | integer | Yes | 0 | Sort order |
| is_available | boolean | Yes | true | Availability flag |
| is_sold | boolean | Yes | false | Sold flag |
| sold_at | timestamptz | Yes | - | Sold timestamp |
| reserved_by | uuid | Yes | - | Reserved by user |
| reserved_until | timestamptz | Yes | - | Reservation expiry |
| created_at | timestamptz | Yes | now() | Creation timestamp |
| updated_at | timestamptz | Yes | now() | Last update |

---

### conversations
Chat conversations between buyers and sellers.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| listing_id | uuid | No | - | References listings.id |
| buyer_id | uuid | No | - | References profiles.id |
| seller_id | uuid | No | - | References profiles.id |
| created_at | timestamptz | Yes | now() | Creation timestamp |
| updated_at | timestamptz | Yes | now() | Last update |

**RLS Policies:**
- Buyers can create conversations
- Users can view conversations where they are buyer or seller

---

### messages
Individual messages within conversations.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| conversation_id | uuid | No | - | References conversations.id |
| sender_id | uuid | No | - | References profiles.id |
| content | text | No | - | Message content |
| read | boolean | Yes | false | Read status |
| read_at | timestamptz | Yes | - | Read timestamp |
| metadata | jsonb | Yes | {} | Additional metadata |
| created_at | timestamptz | Yes | now() | Creation timestamp |

**RLS Policies:**
- Users can view/send messages in their conversations
- Users can update messages in their conversations (mark as read)

---

### offers
Price offers on listings.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| listing_id | uuid | No | - | References listings.id |
| conversation_id | uuid | No | - | References conversations.id |
| buyer_id | uuid | No | - | References profiles.id |
| seller_id | uuid | No | - | References profiles.id |
| amount | numeric | No | - | Offer amount |
| message | text | Yes | - | Offer message |
| status | text | No | 'pending' | 'pending', 'accepted', 'rejected', 'countered', 'expired' |
| counter_offer_to | uuid | Yes | - | References offers.id |
| expires_at | timestamptz | Yes | now() + 48h | Expiration time |
| created_at | timestamptz | Yes | now() | Creation timestamp |
| updated_at | timestamptz | Yes | now() | Last update |

**RLS Policies:**
- Buyers can create offers
- Sellers can update offers (accept/reject/counter)
- Both parties can view offers

---

### orders
Purchase orders.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | uuid_generate_v4() | Primary key |
| buyer_id | uuid | No | - | References profiles.id |
| seller_id | uuid | No | - | References profiles.id |
| total_amount | numeric | No | - | Total order amount |
| platform_fee | numeric | No | - | Platform fee |
| seller_amount | numeric | No | - | Seller payout amount |
| shipping_cost | numeric | Yes | 0 | Shipping cost |
| currency | text | No | 'GBP' | Order currency |
| status | text | No | 'pending' | Order status |
| shipping_status | text | Yes | 'awaiting_shipment' | Shipping status |
| shipping_address | jsonb | No | - | Delivery address |
| address_validated | boolean | Yes | false | Address validated |
| address_validation_details | jsonb | Yes | {} | Validation details |
| tracking_number | text | Yes | - | Tracking number |
| carrier | text | Yes | - | Shipping carrier |
| shipped_at | timestamptz | Yes | - | Shipped timestamp |
| delivered_at | timestamptz | Yes | - | Delivered timestamp |
| created_at | timestamptz | No | now() | Creation timestamp |
| updated_at | timestamptz | No | now() | Last update |

**Order Status Values:**
- 'pending', 'paid', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded', 'disputed'

**Shipping Status Values:**
- 'awaiting_shipment', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'returned'

**RLS Policies:**
- Buyers can create orders
- Users can view orders where they are buyer or seller

---

### order_items
Individual items within an order.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | uuid_generate_v4() | Primary key |
| order_id | uuid | No | - | References orders.id |
| listing_id | uuid | No | - | References listings.id |
| variant_id | uuid | Yes | - | References listing_variants.id |
| price | numeric | No | - | Item price |
| created_at | timestamptz | No | now() | Creation timestamp |

---

### saved_listings
User's saved/favorited listings.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| user_id | uuid | No | - | References profiles.id |
| listing_id | uuid | No | - | References listings.id |
| created_at | timestamptz | Yes | now() | Creation timestamp |

---

### notifications
User notifications.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| user_id | uuid | No | - | References profiles.id |
| type | text | No | - | Notification type |
| title | text | No | - | Notification title |
| message | text | No | - | Notification message |
| link | text | Yes | - | Deep link URL |
| metadata | jsonb | Yes | - | Additional data |
| read | boolean | Yes | false | Read status |
| created_at | timestamptz | Yes | now() | Creation timestamp |

---

### ratings
Reviews and ratings for transactions.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| order_id | uuid | No | - | References orders.id |
| listing_id | uuid | No | - | References listings.id |
| reviewer_id | uuid | No | - | References profiles.id |
| reviewee_id | uuid | No | - | References profiles.id |
| review_type | text | No | - | 'buyer_to_seller', 'seller_to_buyer' |
| rating | integer | No | - | Rating 1-5 |
| review_text | text | Yes | - | Review text |
| communication_rating | integer | Yes | - | Communication score |
| speed_rating | integer | Yes | - | Speed score |
| packaging_rating | integer | Yes | - | Packaging score |
| review_images | jsonb | Yes | - | Image URLs |
| verified_purchase | boolean | Yes | - | Verified purchase |
| helpful_count | integer | Yes | 0 | Helpful votes |
| seller_response | text | Yes | - | Seller response |
| seller_response_at | timestamptz | Yes | - | Response timestamp |
| ai_sentiment_score | numeric | Yes | - | AI sentiment |
| ai_moderation_status | text | Yes | - | Moderation status |
| ai_moderation_reason | text | Yes | - | Moderation reason |
| created_at | timestamptz | Yes | now() | Creation timestamp |
| updated_at | timestamptz | Yes | now() | Last update |

---

### pokemon_card_attributes
Pokemon card database for card identification.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| card_id | varchar | No | - | Unique card identifier |
| name | varchar | No | - | Card name |
| name_en | text | Yes | - | English name |
| set_name | varchar | No | - | Set name |
| set_code | varchar | Yes | - | Set code |
| number | varchar | Yes | - | Card number |
| display_number | text | Yes | - | Display number |
| search_number | text | Yes | - | Searchable number |
| rarity | varchar | Yes | - | Card rarity |
| supertype | varchar | Yes | - | Pokemon, Trainer, Energy |
| subtypes | text[] | Yes | - | Subtypes array |
| types | text[] | Yes | - | Pokemon types |
| artist | varchar | Yes | - | Card artist |
| printed_total | integer | Yes | - | Total cards in set |
| images | jsonb | Yes | - | Image URLs |
| tcgplayer_id | varchar | Yes | - | TCGPlayer ID |
| tcgplayer_prices | jsonb | Yes | - | TCGPlayer prices |
| cardmarket_id | varchar | Yes | - | Cardmarket ID |
| cardmarket_prices | jsonb | Yes | - | Cardmarket prices |
| last_price_update | timestamptz | Yes | - | Price update time |
| popularity_score | integer | Yes | 0 | Popularity score |
| last_searched_at | timestamptz | Yes | - | Last searched |
| metadata | jsonb | Yes | {} | Additional metadata |
| sync_source | enum | Yes | - | Data source |
| synced_at | timestamptz | Yes | - | Sync timestamp |
| search_vector | tsvector | Yes | - | Full-text search |
| created_at | timestamptz | Yes | now() | Creation timestamp |
| updated_at | timestamptz | Yes | now() | Last update |

---

## Query Patterns

### Fetch Active Listings (Simple)
```typescript
const { data, error } = await supabase
  .from('listings')
  .select('*')
  .eq('status', 'active')
  .order('created_at', { ascending: false })
  .limit(20);
```

### Fetch Listings with Seller & Images
```typescript
const { data, error } = await supabase
  .from('listings')
  .select(`
    *,
    seller:profiles!seller_id (
      id,
      full_name,
      avatar_url,
      trust_score,
      verification_level
    ),
    images:listing_images (
      id,
      image_url,
      display_order
    )
  `)
  .eq('status', 'active')
  .order('created_at', { ascending: false })
  .limit(20);
```

### Fetch Single Listing by ID
```typescript
const { data, error } = await supabase
  .from('listings')
  .select(`
    *,
    seller:profiles!seller_id (
      id,
      full_name,
      avatar_url,
      trust_score,
      bio,
      created_at,
      verification_level
    ),
    images:listing_images (
      id,
      image_url,
      display_order
    ),
    variants:listing_variants (
      id,
      variant_name,
      variant_price,
      variant_condition,
      variant_images,
      is_available,
      is_sold
    )
  `)
  .eq('id', listingId)
  .single();
```

### Search Listings
```typescript
const { data, error } = await supabase
  .from('listings')
  .select(`
    *,
    seller:profiles!seller_id (id, full_name, avatar_url, trust_score),
    images:listing_images (image_url, display_order)
  `)
  .eq('status', 'active')
  .ilike('title', `%${searchQuery}%`)
  .order('created_at', { ascending: false });
```

### Filter Listings by Category
```typescript
const { data, error } = await supabase
  .from('listings')
  .select(`
    *,
    seller:profiles!seller_id (id, full_name, avatar_url),
    images:listing_images (image_url, display_order)
  `)
  .eq('status', 'active')
  .eq('category', 'Pokemon Cards')
  .gte('seller_price', minPrice)
  .lte('seller_price', maxPrice)
  .order('seller_price', { ascending: true });
```

### Get User Profile
```typescript
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single();
```

### Get User's Listings
```typescript
const { data, error } = await supabase
  .from('listings')
  .select(`
    *,
    images:listing_images (image_url, display_order)
  `)
  .eq('seller_id', userId)
  .order('created_at', { ascending: false });
```

### Get User's Orders (as Buyer)
```typescript
const { data, error } = await supabase
  .from('orders')
  .select(`
    *,
    items:order_items (
      *,
      listing:listings (
        id,
        title,
        images:listing_images (image_url)
      )
    ),
    seller:profiles!seller_id (id, full_name, avatar_url)
  `)
  .eq('buyer_id', userId)
  .order('created_at', { ascending: false });
```

### Get User's Sales (as Seller)
```typescript
const { data, error } = await supabase
  .from('orders')
  .select(`
    *,
    items:order_items (
      *,
      listing:listings (id, title)
    ),
    buyer:profiles!buyer_id (id, full_name, avatar_url)
  `)
  .eq('seller_id', userId)
  .order('created_at', { ascending: false });
```

### Get Conversations
```typescript
const { data, error } = await supabase
  .from('conversations')
  .select(`
    *,
    listing:listings (id, title, seller_price, images:listing_images(image_url)),
    buyer:profiles!buyer_id (id, full_name, avatar_url),
    seller:profiles!seller_id (id, full_name, avatar_url),
    messages (id, content, sender_id, read, created_at)
  `)
  .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
  .order('updated_at', { ascending: false });
```

### Get Messages in Conversation
```typescript
const { data, error } = await supabase
  .from('messages')
  .select(`
    *,
    sender:profiles!sender_id (id, full_name, avatar_url)
  `)
  .eq('conversation_id', conversationId)
  .order('created_at', { ascending: true });
```

### Send Message
```typescript
const { data, error } = await supabase
  .from('messages')
  .insert({
    conversation_id: conversationId,
    sender_id: currentUserId,
    content: messageContent
  })
  .select()
  .single();
```

### Create Offer
```typescript
const { data, error } = await supabase
  .from('offers')
  .insert({
    listing_id: listingId,
    conversation_id: conversationId,
    buyer_id: currentUserId,
    seller_id: sellerId,
    amount: offerAmount,
    message: offerMessage
  })
  .select()
  .single();
```

### Save/Unsave Listing
```typescript
// Save
const { error } = await supabase
  .from('saved_listings')
  .insert({ user_id: userId, listing_id: listingId });

// Unsave
const { error } = await supabase
  .from('saved_listings')
  .delete()
  .eq('user_id', userId)
  .eq('listing_id', listingId);

// Check if saved
const { data } = await supabase
  .from('saved_listings')
  .select('id')
  .eq('user_id', userId)
  .eq('listing_id', listingId)
  .single();
```

### Get Saved Listings
```typescript
const { data, error } = await supabase
  .from('saved_listings')
  .select(`
    listing:listings (
      *,
      seller:profiles!seller_id (id, full_name, avatar_url),
      images:listing_images (image_url, display_order)
    )
  `)
  .eq('user_id', userId)
  .order('created_at', { ascending: false });
```

### Get Notifications
```typescript
const { data, error } = await supabase
  .from('notifications')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(50);
```

### Mark Notification as Read
```typescript
const { error } = await supabase
  .from('notifications')
  .update({ read: true })
  .eq('id', notificationId)
  .eq('user_id', userId);
```

---

## Edge Functions

All edge functions are called via:
```typescript
const { data, error } = await supabase.functions.invoke('function-name', {
  body: { /* parameters */ }
});
```

### Authentication & User

| Function | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `track-user-session` | POST | Yes | Track user session/activity |

### Listings & Search

| Function | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `pokemon-search` | POST | No | Search Pokemon cards database |
| `ai-price-suggestion` | POST | Yes | Get AI price suggestions |
| `ai-listing-photo` | POST | Yes | Create listing from photo |
| `ai-analyse-listing-image` | POST | Yes | Analyze listing image quality |
| `generate-listing-description` | POST | Yes | AI-generate listing description |
| `increment-listing-views` | POST | No | Increment view count |
| `increment-listing-saves` | POST | Yes | Increment save count |

**Pokemon Search Example:**
```typescript
const { data, error } = await supabase.functions.invoke('pokemon-search', {
  body: {
    query: 'Charizard',
    setCode: 'sv1', // optional
    limit: 20
  }
});
```

**AI Price Suggestion Example:**
```typescript
const { data, error } = await supabase.functions.invoke('ai-price-suggestion', {
  body: {
    title: 'Charizard VMAX',
    condition: 'near_mint',
    cardId: 'sv1-123'
  }
});
```

### Checkout & Payments

| Function | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `create-checkout` | POST | Yes | Create Stripe checkout session |
| `create-payment-intent` | POST | Yes | Create payment intent |
| `stripe-webhook` | POST | No | Stripe webhook handler |
| `create-stripe-connect-account` | POST | Yes | Create seller Stripe account |
| `create-stripe-connect-onboarding` | POST | Yes | Get onboarding link |
| `check-stripe-connect-status` | POST | Yes | Check seller account status |

**Create Checkout Example:**
```typescript
const { data, error } = await supabase.functions.invoke('create-checkout', {
  body: {
    listingId: 'uuid',
    variantId: 'uuid', // optional
    shippingAddress: {
      name: 'John Doe',
      line1: '123 Main St',
      city: 'London',
      postal_code: 'SW1A 1AA',
      country: 'GB'
    }
  }
});
// Returns: { url: 'https://checkout.stripe.com/...' }
```

### Wallet & Credits

| Function | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `wallet-deposit` | POST | Yes | Add funds to wallet |
| `wallet-withdraw` | POST | Yes | Withdraw from wallet |
| `wallet-transfer` | POST | Yes | Transfer between users |
| `get-wallet-balance` | POST | Yes | Get wallet balance |

### Shipping

| Function | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `sendcloud-get-rates` | POST | Yes | Get shipping rates |
| `sendcloud-create-label` | POST | Yes | Create shipping label |
| `sendcloud-track-parcel` | POST | Yes | Track shipment |
| `validate-address` | POST | Yes | Validate shipping address |

**Get Shipping Rates Example:**
```typescript
const { data, error } = await supabase.functions.invoke('sendcloud-get-rates', {
  body: {
    from: {
      country: 'GB',
      postal_code: 'SW1A 1AA'
    },
    to: {
      country: 'GB',
      postal_code: 'EC1A 1BB'
    },
    weight: 0.5, // kg
    dimensions: { length: 20, width: 15, height: 5 } // cm
  }
});
```

### Trade System

| Function | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `trade-create` | POST | Yes | Create trade offer |
| `trade-accept` | POST | Yes | Accept trade offer |
| `trade-reject` | POST | Yes | Reject trade offer |
| `trade-counter` | POST | Yes | Counter trade offer |

### Messaging & Notifications

| Function | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `send-notification` | POST | System | Send push notification |
| `send-email` | POST | System | Send email notification |

---

## Storage Buckets

All buckets are public for read access.

| Bucket | Purpose | Example URL |
|--------|---------|-------------|
| `listing-images` | Listing photos | `https://ouvrgsvrkjxltbcwvuyz.supabase.co/storage/v1/object/public/listing-images/{path}` |
| `avatars` | Profile pictures | `https://ouvrgsvrkjxltbcwvuyz.supabase.co/storage/v1/object/public/avatars/{path}` |
| `message-attachments` | Chat attachments | `https://ouvrgsvrkjxltbcwvuyz.supabase.co/storage/v1/object/public/message-attachments/{path}` |
| `review-images` | Review photos | `https://ouvrgsvrkjxltbcwvuyz.supabase.co/storage/v1/object/public/review-images/{path}` |

### Upload Image
```typescript
const { data, error } = await supabase.storage
  .from('listing-images')
  .upload(`${userId}/${fileName}`, file, {
    cacheControl: '3600',
    upsert: false
  });

// Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('listing-images')
  .getPublicUrl(`${userId}/${fileName}`);
```

---

## Real-time Subscriptions

### Subscribe to Messages
```typescript
const channel = supabase
  .channel('messages')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`
    },
    (payload) => {
      console.log('New message:', payload.new);
    }
  )
  .subscribe();

// Cleanup
channel.unsubscribe();
```

### Subscribe to Notifications
```typescript
const channel = supabase
  .channel('notifications')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`
    },
    (payload) => {
      console.log('New notification:', payload.new);
    }
  )
  .subscribe();
```

### Subscribe to Order Updates
```typescript
const channel = supabase
  .channel('order-updates')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'orders',
      filter: `id=eq.${orderId}`
    },
    (payload) => {
      console.log('Order updated:', payload.new);
    }
  )
  .subscribe();
```

---

## Type Definitions

### TypeScript Types for iOS (Swift Equivalent)

```typescript
// Listing
interface Listing {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  seller_price: number;
  suggested_price: number | null;
  currency: string;
  condition: 'mint' | 'near_mint' | 'excellent' | 'good' | 'light_play' | 'played' | 'poor' | null;
  status: 'draft' | 'active' | 'sold' | 'reserved' | 'deleted';
  category: string | null;
  subcategory: string | null;
  brand: string | null;
  card_id: string | null;
  set_code: string | null;
  marketplace: 'UK' | 'US' | 'EU' | 'AU' | 'JP';
  accepts_offers: boolean;
  trade_enabled: boolean;
  free_shipping: boolean;
  shipping_cost_uk: number;
  shipping_cost_europe: number;
  shipping_cost_international: number;
  views: number;
  saves: number;
  has_variants: boolean;
  bundle_type: 'none' | 'pick_any' | 'full';
  created_at: string;
  updated_at: string;
  // Nested relations
  seller?: Profile;
  images?: ListingImage[];
  variants?: ListingVariant[];
}

// Profile
interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;  // NOT username!
  avatar_url: string | null;
  bio: string | null;
  trust_score: number;
  verification_level: string | null;
  phone_verified: boolean;
  email_verified: boolean;
  id_verified: boolean;
  created_at: string;
}

// ListingImage
interface ListingImage {
  id: string;
  listing_id: string;
  image_url: string;
  display_order: number;
}

// ListingVariant
interface ListingVariant {
  id: string;
  listing_id: string;
  variant_name: string;
  variant_price: number;
  variant_condition: string | null;
  variant_images: string[];
  is_available: boolean;
  is_sold: boolean;
}

// Conversation
interface Conversation {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  created_at: string;
  updated_at: string;
  listing?: Listing;
  buyer?: Profile;
  seller?: Profile;
  messages?: Message[];
}

// Message
interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  read_at: string | null;
  metadata: object;
  created_at: string;
}

// Offer
interface Offer {
  id: string;
  listing_id: string;
  conversation_id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  message: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'countered' | 'expired';
  counter_offer_to: string | null;
  expires_at: string;
  created_at: string;
}

// Order
interface Order {
  id: string;
  buyer_id: string;
  seller_id: string;
  total_amount: number;
  platform_fee: number;
  seller_amount: number;
  shipping_cost: number;
  currency: string;
  status: string;
  shipping_status: string;
  shipping_address: ShippingAddress;
  tracking_number: string | null;
  carrier: string | null;
  created_at: string;
  items?: OrderItem[];
}

// ShippingAddress
interface ShippingAddress {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postal_code: string;
  country: string;
  phone?: string;
}

// Notification
interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  metadata: object | null;
  read: boolean;
  created_at: string;
}

// PokemonCard
interface PokemonCard {
  id: string;
  card_id: string;
  name: string;
  set_name: string;
  set_code: string | null;
  number: string | null;
  rarity: string | null;
  supertype: string | null;
  subtypes: string[] | null;
  types: string[] | null;
  artist: string | null;
  images: {
    small?: string;
    large?: string;
  } | null;
  tcgplayer_prices: object | null;
  cardmarket_prices: object | null;
}
```

---

## Common Patterns

### Error Handling
```typescript
const { data, error } = await supabase.from('listings').select('*');

if (error) {
  console.error('Error:', error.message);
  // Handle specific error codes
  if (error.code === 'PGRST116') {
    // No rows found
  } else if (error.code === '42501') {
    // RLS policy violation
  }
  return;
}

// Success - use data
```

### Pagination
```typescript
const PAGE_SIZE = 20;

const { data, error } = await supabase
  .from('listings')
  .select('*', { count: 'exact' })
  .eq('status', 'active')
  .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
  .order('created_at', { ascending: false });

// data.length = items in this page
// Use count for total
```

### Image URL Construction
```typescript
const getImageUrl = (path: string, bucket: string = 'listing-images') => {
  return `https://ouvrgsvrkjxltbcwvuyz.supabase.co/storage/v1/object/public/${bucket}/${path}`;
};
```

---

## Important Notes

1. **CRITICAL**: Use `seller_id` NOT `user_id` for listings
2. **CRITICAL**: Use `full_name` NOT `username` for profiles
3. **CRITICAL**: Join syntax is `profiles!seller_id` NOT `profiles!user_id`
4. **RLS**: Only `status = 'active'` listings are publicly visible
5. **Auth**: Most write operations require authentication
6. **Currency**: Default currency is GBP, amounts are in decimal (e.g., 10.50)
7. **Timestamps**: All timestamps are ISO 8601 format in UTC

---

## Contact

For questions about this API, contact the Slabz development team.
