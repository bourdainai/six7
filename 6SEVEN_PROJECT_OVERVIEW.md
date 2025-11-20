# 6Seven - Project Overview (Master Document)

## Project Identity

**Name:** 6Seven  
**Tagline:** AI Native Trading Marketplace  
**Domain:** Trading Card Marketplace (Pokémon TCG Primary)

## Vision Statement

6Seven is a vertical marketplace built for modern trading behaviour, where cash offers, trade offers, bundles, AI valuation, structured product data, agent integrations, and internal wallet mechanics replace the old buy-and-sell model.

This is the first UK marketplace to bring real card show trading dynamics online with full AI support, MCP tools, ACP checkout, and a wallet system that cuts payment friction.

---

## Current Status (Reset Clean)

✅ AI foundation built (listing analysis, fraud detection, price suggestion)  
✅ Supabase project operational  
✅ Stripe Connect partially integrated  
✅ Core listing and offer systems working  
✅ Browse, search, messaging, seller dashboards functional  
✅ Seller analytics and automation systems functional  
✅ AI buyer and seller agents already running as Supabase edge functions  
✅ Hosting on Lovable Cloud  
✅ Automated indexing, semantic search, vibe search active  

---

## High-Level Objective

> **The job is not to get the job done, it's to do it better than it's ever been done before by anyone.**

Build the fully operational AI-native trading marketplace with:

- ✨ Structured product data
- 💰 Dual cash + trade negotiation
- 📦 Trading bundles
- 💳 Wallet-based payments
- 🤖 AI valuation and description enhancement
- 📹 Video + photo listing support
- 🔌 ACP endpoint integration for agent checkout
- 🛠️ MCP tooling exposed for agent workflows
- 📱 Mobile apps via Capacitor (iOS + Android)
- ⚡ Cloudflare performance and security layer
- 📮 Shipping integrations including print-at-home labels
- 🎧 Human support dashboard and agent-tier support bots

---

## 6Seven Differentiators

6Seven is not a traditional marketplace. It is:

1. **AI First** - Every action enhanced by intelligence
2. **Agent Ready** - Built for autonomous AI buyers/sellers
3. **Trade First** - Cash + cards in every transaction
4. **Wallet First** - Internal balance reduces friction
5. **Vertical Structured** - Deep Pokémon TCG data integration
6. **Mobile Native** - Apps from day one
7. **Protocol Compliant** - MCP + ACP native
8. **Show Floor Online** - Real trading dynamics digitized

### Competitive Advantage

Competitors use:
- ❌ Cash-only transactions
- ❌ Manual listing creation
- ❌ Manual pricing
- ❌ Slow customer support
- ❌ Fee-heavy payment flows

6Seven provides:
- ✅ Cash + trade hybrid offers
- ✅ AI-powered auto-listing
- ✅ Real-time comp-based pricing
- ✅ AI + human support hybrid
- ✅ Wallet system to minimize fees

---

## Core User Segments

| Segment | Needs | 6Seven Solution |
|---------|-------|-----------------|
| **Collectors** | Safe trading, fair deals | AI valuation, fraud detection, trade offers |
| **Resellers** | Speed, bulk listing, automation | Auto-listing from photos, inventory tools |
| **Investment Buyers** | Price history, comps, analytics | Comp database, price trends, alerts |
| **AI Agent Traders** | Programmatic access | MCP tools, ACP endpoints |
| **Card Show Sellers** | Low fees, instant listing | Wallet system, mobile app, 1-tap listing |

---

## Primary Value Propositions

1. **Lowest Trading Friction in the UK**
2. Cash + trade offers in one workflow
3. AI-enhanced listing creation
4. Image-based instant auto-listing
5. Auto pricing using real sold comps
6. Fake card AI detection
7. Video listings for condition proof
8. Wallet that reduces Stripe fees
9. ACP for agent buying
10. MCP for programmatic trading
11. Fast shipping via print-at-home labels
12. Structured inventory for power sellers
13. App on iOS + Android from one codebase

---

## Project Scope - Complete Ecosystem

### Core Systems

#### 1. **AI Listing Engine**
- Photo upload → auto-detect card → auto-fill form → suggest price → publish
- Video support for condition verification
- Description generation with AI
- Quality validation and enhancement

#### 2. **Trade + Cash Offer Engine**
- Attach inventory items to offers
- Automatic valuation per item
- AI fairness scoring
- Counter-offer workflow
- Photo attachments for trade items

#### 3. **Wallet System**
- Deposit/withdraw via Stripe
- Internal free transfers
- Seller earnings pool
- Auto fee reduction
- Full ACP integration

#### 4. **ACP Integration** (Agentic Commerce Protocol)
- GET /acp/products (full catalog)
- GET /acp/product/:id (single item)
- POST /acp/checkout (create session)
- POST /acp/payment (capture payment)
- POST /acp/confirm (finalize order)

#### 5. **MCP Integration** (Model Context Protocol)
- Programmatic search
- Auto-listing creation
- Price evaluation
- Trade proposals
- Purchase execution
- Wallet operations
- Fake card detection

#### 6. **Shipping Automation**
- UK carrier integrations (Royal Mail, Evri, DPD, ParcelForce)
- Print-at-home labels
- Tracking webhooks
- Email notifications
- Delivery timeline display

#### 7. **Customer Service Backend**
- Admin dashboard for disputes
- Refund processing
- Fake card review queue
- Message moderation
- Risk score management
- User suspension tools

#### 8. **Mobile Applications**
- iOS app via Capacitor
- Android app via Capacitor
- Push notifications
- Deep linking
- App Store + Play Store ready

#### 9. **Cloudflare Infrastructure**
- DNS management
- HTTPS/SSL
- Static asset caching
- WAF rules
- DDoS protection
- Bot mitigation

#### 10. **Pokémon TCG API Integration**
- Daily sync of card data
- Auto-populate form fields
- Set, rarity, variant dropdowns
- Structured metadata storage

---

## Core Deliverables Summary

| # | System | Status |
|---|--------|--------|
| 1 | ACP Full Setup | 📋 Planned |
| 2 | Pokémon TCG API Integration | 📋 Planned |
| 3 | Shipping Contracts + Print Labels | 📋 Planned |
| 4 | Customer Service Backend | 📋 Planned |
| 5 | Listing Media Support (Photo/Video) | 📋 Planned |
| 6 | Trade + Cash Offer Engine | 📋 Planned |
| 7 | AI Description Engine | 📋 Planned |
| 8 | Fake Card AI Detector | 📋 Planned |
| 9 | TikTok-Style Shopping Feed | 📋 Planned |
| 10 | 6Seven Wallet System | 📋 Planned |
| 11 | Mobile Apps (iOS/Android) | 📋 Planned |
| 12 | Cloudflare Setup | 📋 Planned |
| 13 | MCP Setup (Tools + Endpoints) | 📋 Planned |
| 14 | AI Auto-Listing from Photos | 📋 Planned |
| 15 | Price Based on Sold Comps | 📋 Planned |
| 16 | Bundles + Items + Extras | 📋 Planned |

---

## Tech Stack

### Frontend
- **Framework:** React 18
- **Language:** TypeScript
- **Build Tool:** Vite
- **UI Library:** Radix UI
- **Styling:** Tailwind CSS
- **State Management:** React Query
- **Mobile:** Capacitor

### Backend
- **Database:** Supabase (PostgreSQL)
- **Functions:** Supabase Edge Functions (Deno)
- **Storage:** Supabase Storage (images/videos)
- **Auth:** Supabase Auth
- **Real-time:** Supabase Realtime

### Payments
- **Primary:** Stripe Connect
- **Wallet:** Internal balance system
- **Payouts:** Stripe Connect transfers

### Infrastructure
- **Hosting:** Lovable Cloud
- **CDN/Security:** Cloudflare
- **DNS:** Cloudflare
- **SSL:** Cloudflare

### Integrations
- **Pokémon TCG API:** Card data sync
- **Shipping APIs:** Royal Mail, Evri, DPD, ParcelForce
- **AI Services:** OpenAI (via Supabase)

### Protocols
- **ACP:** Agentic Commerce Protocol
- **MCP:** Model Context Protocol

---

## Documentation Structure

### Strategic Documents
- `6SEVEN_PROJECT_OVERVIEW.md` (this file) - Master reference
- `6SEVEN_FEATURE_SPECS.md` - Detailed feature requirements
- `6SEVEN_TECHNICAL_BLUEPRINT.md` - Implementation architecture
- `6SEVEN_IMPLEMENTATION_ROADMAP.md` - Phased delivery plan
- `6SEVEN_PLANNING_INDEX.md` - Navigation guide

### Implementation Guides
- `6SEVEN_ACP_GUIDE.md` - ACP implementation
- `6SEVEN_MCP_GUIDE.md` - MCP implementation
- `6SEVEN_SCHEMA_MIGRATION.md` - Database changes
- `6SEVEN_EDGE_FUNCTIONS.md` - Function architecture
- `6SEVEN_QUICK_START.md` - Developer onboarding

### Reference Documents
- `README.md` - Project introduction
- `STRIPE_SETUP_GUIDE.md` - Payment setup
- `DATABASE_MIGRATION_GUIDE.md` - Schema management

---

## Success Metrics (Target State)

### User Growth
- 50,000+ registered users (from current 12,500)
- 5,000+ active sellers
- 10,000+ active buyers

### Transaction Volume
- £5M GMV annually (from current £850K)
- 30% of transactions include trade offers
- 60% wallet adoption rate

### AI Adoption
- 80% of listings use AI auto-creation
- 500+ daily agent transactions via ACP
- 95%+ fake card detection accuracy

### Mobile
- 40% of GMV from mobile apps
- 4.5+ star rating on App Store/Play Store

### Performance
- <200ms p95 page load (via Cloudflare)
- 99.9% uptime
- <1% fraud rate

---

## Next Steps for Cursor

1. **Review all planning documents** in sequence:
   - 6SEVEN_PROJECT_OVERVIEW.md (this file)
   - 6SEVEN_FEATURE_SPECS.md
   - 6SEVEN_TECHNICAL_BLUEPRINT.md
   - 6SEVEN_IMPLEMENTATION_ROADMAP.md

2. **Understand current codebase state**
   - Existing components to repurpose
   - Supabase schema to extend
   - Edge functions to modify

3. **Begin implementation** following roadmap phases

4. **Track progress** against deliverables table above

---

## Project Status: REPLANNING COMPLETE ✅

This document supersedes all previous planning documents and establishes 6Seven as the authoritative project direction.

**Last Updated:** 2025-11-19  
**Document Owner:** Project Lead  
**Next Review:** After Phase 1 completion
