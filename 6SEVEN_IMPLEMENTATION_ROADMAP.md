# 6Seven - Implementation Roadmap

**Timeline:** 16 weeks from project kickoff  
**Goal:** Launch fully operational AI-native trading card marketplace

---

## Overview

This roadmap breaks down 6Seven implementation into **12 phases** across 16 weeks. Each phase is designed to deliver working, testable features that build upon previous work.

### Guiding Principles

1. **Iterative delivery** - Ship working features every 1-2 weeks
2. **Test continuously** - Every feature must have tests before moving forward
3. **User feedback loops** - Gather feedback from beta users at key milestones
4. **AI-first** - Prioritize AI features that differentiate 6Seven
5. **Mobile-ready** - Ensure all features work on mobile from day one

---

## Phase 1: Foundation & Data (Weeks 1-2)

### Objectives
- Set up database schema for trading cards
- Integrate Pokémon TCG API
- Build pricing comps system
- Establish development workflow

### Tasks

#### Week 1: Database Schema
- [ ] Create database migration scripts for all new tables
- [ ] Add trading card columns to listings table
- [ ] Create trade_offers table
- [ ] Create wallet_accounts and related tables
- [ ] Create shipping tables
- [ ] Create pokemon_card_attributes table
- [ ] Create pricing_comps and market_prices tables
- [ ] Set up indexes for performance
- [ ] Configure RLS policies
- [ ] Test database with seed data

#### Week 2: Data Integrations
- [ ] Create Pokemon TCG API client library (`lib/pokemon-tcg.ts`)
- [ ] Implement `sync-tcg-data` edge function
- [ ] Set up daily cron job for TCG data sync
- [ ] Populate initial card database (all sets, 10K+ cards)
- [ ] Create pricing comps ingestion function
- [ ] Connect to TCG Player API for sold prices
- [ ] Set up daily pricing sync cron job
- [ ] Build market price calculation algorithm
- [ ] Test end-to-end data pipeline

### Deliverables
✅ Complete database schema  
✅ 10,000+ Pokémon cards in database  
✅ Daily data sync automation  
✅ Historical pricing data for top 1,000 cards  

### Success Metrics
- Database queries < 100ms average
- TCG API sync completes in < 10 minutes
- 95%+ of popular cards have pricing data

---

## Phase 2: Wallet System (Weeks 3-4)

### Objectives
- Build internal wallet for users
- Integrate Stripe for deposits/withdrawals
- Create transaction logging
- Enable wallet payments in checkout

### Tasks

#### Week 3: Wallet Backend
- [ ] Create `wallet-deposit` edge function
- [ ] Create `wallet-withdraw` edge function
- [ ] Create `wallet-transfer` edge function
- [ ] Create `wallet-settlement` edge function (seller payouts)
- [ ] Integrate Stripe payment intents for deposits
- [ ] Integrate Stripe Connect for withdrawals
- [ ] Build transaction logging system
- [ ] Implement balance validation and locking
- [ ] Create wallet initialization on user signup
- [ ] Write unit tests for wallet operations

#### Week 4: Wallet Frontend
- [ ] Create `WalletBalance` component (header display)
- [ ] Create `WalletDeposit` modal with Stripe integration
- [ ] Create `WalletWithdraw` modal with bank account linking
- [ ] Create `WalletTransactions` history page
- [ ] Build `useWallet` React hook
- [ ] Add wallet payment option to checkout flow
- [ ] Show wallet balance during checkout
- [ ] Create wallet management page (`/wallet`)
- [ ] Add "Pending Earnings" section for sellers
- [ ] Write Cypress E2E tests for deposit/withdraw

### Deliverables
✅ Fully functional wallet system  
✅ Stripe integration for deposits/withdrawals  
✅ Transaction history and auditing  
✅ Wallet payment option in checkout  

### Success Metrics
- Deposit success rate > 99%
- Withdrawal processing < 2 business days
- Wallet adoption rate > 30% after first purchase

---

## Phase 3: Trade System (Weeks 5-6)

### Objectives
- Enable trade + cash offers
- Build AI valuation engine
- Implement fairness scoring
- Create trade negotiation workflow

### Tasks

#### Week 5: Trade Backend
- [ ] Create `trade-create` edge function
- [ ] Create `trade-counter` edge function
- [ ] Create `trade-accept` edge function
- [ ] Create `trade-reject` edge function
- [ ] Implement `trade-valuation` AI function
- [ ] Build `trade-fairness` scoring algorithm
- [ ] Create trade notification system
- [ ] Build inventory locking mechanism
- [ ] Implement trade expiration (7 days)
- [ ] Create trade completion workflow (dual shipping)

#### Week 6: Trade Frontend
- [ ] Create `TradeOfferModal` component
- [ ] Build `TradeItemSelector` with user inventory
- [ ] Create `TradeFairnessScore` display widget
- [ ] Build `TradeOfferCard` component
- [ ] Create trade offers inbox page (`/trade-offers`)
- [ ] Add "Make Trade Offer" button to listing pages
- [ ] Implement photo upload for trade items
- [ ] Show AI valuation suggestions
- [ ] Build counter-offer interface
- [ ] Create trade status tracking page

### Deliverables
✅ Complete trade offer system  
✅ AI-powered valuation  
✅ Fairness scoring algorithm  
✅ Trade inbox and management UI  

### Success Metrics
- Trade offer creation success rate > 95%
- AI valuation accuracy within ±10% of market
- Trade acceptance rate > 40%

---

## Phase 4: AI Listing Tools (Week 7)

### Objectives
- Auto-list from photos
- AI-generated descriptions
- Automated pricing suggestions
- One-tap publishing

### Tasks

#### Week 7: AI Listing System
- [ ] Create `ai-analyse-images` edge function (card detection)
- [ ] Implement `ai-generate-description` function
- [ ] Build `ai-price-suggestion` using comps data
- [ ] Create `ai-auto-list-from-photos` orchestration function
- [ ] Train/configure image recognition model
- [ ] Build confidence scoring system
- [ ] Create `QuickListModal` frontend component
- [ ] Implement photo upload with progress
- [ ] Show AI-generated preview before publishing
- [ ] Add "Auto-Generate" button to manual listing form
- [ ] Build bulk upload interface for power sellers
- [ ] Create seller onboarding tutorial for AI listing

### Deliverables
✅ AI auto-listing from photos  
✅ AI description generation  
✅ Smart pricing suggestions  
✅ Bulk upload for sellers  

### Success Metrics
- Card detection accuracy > 90%
- Auto-generated descriptions accepted > 80%
- Time to create listing < 2 minutes
- Bulk upload handles 50+ cards successfully

---

## Phase 5: ACP Implementation (Week 8)

### Objectives
- Full Agentic Commerce Protocol support
- Enable AI agent purchasing
- Agent-safe transaction handling
- API key management

### Tasks

#### Week 8: ACP Protocol
- [ ] Create `acp-products` endpoint (catalog)
- [ ] Create `acp-product` endpoint (single item)
- [ ] Create `acp-checkout` endpoint (session creation)
- [ ] Create `acp-payment` endpoint (capture)
- [ ] Create `acp-confirm` endpoint (finalize order)
- [ ] Integrate wallet payments in ACP flow
- [ ] Build inventory reservation system
- [ ] Implement risk scoring for agent purchases
- [ ] Create `acp_sessions` tracking table
- [ ] Build ACP authentication (API keys)
- [ ] Create rate limiting (1000 req/hour)
- [ ] Write ACP documentation page
- [ ] Build agent testing dashboard
- [ ] Create API key management UI
- [ ] Test with sample AI agent

### Deliverables
✅ 5 ACP endpoints functional  
✅ Agent authentication system  
✅ API documentation for developers  
✅ Testing dashboard  

### Success Metrics
- ACP checkout completion rate > 95%
- Average transaction time < 5 seconds
- Zero payment processing errors
- API response time < 300ms p95

---

## Phase 6: Shipping Integration (Week 9)

### Objectives
- Integrate UK shipping carriers
- Print-at-home labels
- Tracking automation
- Email notifications

### Tasks

#### Week 9: Shipping Automation
- [ ] Integrate Royal Mail API (Click & Drop)
- [ ] Integrate Evri API
- [ ] Integrate DPD API
- [ ] Integrate ParcelForce API
- [ ] Create `shipping-create-label` edge function
- [ ] Build label PDF generation
- [ ] Implement `shipping-tracking-webhook` handlers
- [ ] Create `shipping-calc-rates` function
- [ ] Build shipping rate tables in database
- [ ] Create `ShippingLabelViewer` component
- [ ] Build `TrackingTimeline` component
- [ ] Add shipping method selector to listing form
- [ ] Show shipping cost during checkout
- [ ] Send label emails to sellers
- [ ] Send tracking emails to buyers

### Deliverables
✅ 4 carrier integrations  
✅ Print-at-home labels  
✅ Real-time tracking  
✅ Automated notifications  

### Success Metrics
- Label generation success rate > 99%
- Label generation time < 5 seconds
- Tracking webhook processing < 1 minute
- Email delivery rate > 98%

---

## Phase 7: Media & Feed (Week 10)

### Objectives
- Video listing support
- TikTok-style vertical feed
- AI content ranking
- Swipe navigation

### Tasks

#### Week 10: Rich Media & Discovery
- [ ] Set up Supabase Storage for videos
- [ ] Configure video transcoding pipeline
- [ ] Create `media-upload` edge function
- [ ] Create `media-process-video` function
- [ ] Build video thumbnail generation
- [ ] Add video upload to listing creation
- [ ] Create `VideoListingPlayer` component
- [ ] Build `VerticalFeed` component
- [ ] Implement swipe gestures (up/down)
- [ ] Create AI ranking algorithm for feed
- [ ] Build `listing_feed` database view
- [ ] Create feed page (`/feed`)
- [ ] Add autoplay and loop for videos
- [ ] Implement "Like" and "Save" interactions
- [ ] Build feed preloading (infinite scroll)

### Deliverables
✅ Video listing support  
✅ TikTok-style feed  
✅ AI-ranked content  
✅ Mobile-optimized swiping  

### Success Metrics
- Video upload success rate > 95%
- Transcoding time < 30 seconds
- Feed engagement rate > 60%
- Average session time on feed > 5 minutes

---

## Phase 8: Fake Card Detection (Week 11)

### Objectives
- AI authenticity scanner
- Video verification workflow
- Human review dashboard
- Seller communication

### Tasks

#### Week 11: Fraud Prevention
- [ ] Train/configure fake card detection model
- [ ] Create `fake-card-scan` edge function
- [ ] Implement hologram pattern recognition
- [ ] Build print quality analysis
- [ ] Create `fake-card-video-request` function
- [ ] Build `fake-card-review` admin function
- [ ] Create `FakeCardReviewQueue` admin component
- [ ] Build video review interface
- [ ] Implement seller notification emails
- [ ] Create fake card appeal process
- [ ] Add "Verified Authentic" badge to listings
- [ ] Build seller education resources
- [ ] Create fake card statistics dashboard
- [ ] Test with known fake cards

### Deliverables
✅ AI fake card detector  
✅ Video verification system  
✅ Admin review dashboard  
✅ Seller notification workflow  

### Success Metrics
- Detection accuracy > 95%
- False positive rate < 5%
- Review completion time < 24 hours
- Seller appeal response time < 48 hours

---

## Phase 9: MCP Integration (Week 12)

### Objectives
- Model Context Protocol support
- Programmatic agent access
- Tool implementations
- Developer documentation

### Tasks

#### Week 12: MCP Protocol
- [ ] Create `mcp-server` main endpoint
- [ ] Implement `mcp-search` tool
- [ ] Implement `mcp-create-listing` tool
- [ ] Implement `mcp-evaluate-price` tool
- [ ] Implement `mcp-auto-list` tool
- [ ] Implement `mcp-trade-offer` tool
- [ ] Implement `mcp-buy` tool
- [ ] Implement `mcp-wallet` operations tools
- [ ] Implement `mcp-detect-fake` tool
- [ ] Implement `mcp-list-inventory` tool
- [ ] Create `mcp.json` schema definition
- [ ] Build MCP authentication system
- [ ] Create rate limiting per agent
- [ ] Write MCP developer documentation
- [ ] Build tool testing interface
- [ ] Create example agent implementation

### Deliverables
✅ MCP server with 10+ tools  
✅ Agent authentication  
✅ Developer documentation  
✅ Example agent code  

### Success Metrics
- All tools respond < 500ms
- Tool success rate > 99%
- Zero authentication vulnerabilities
- API adoption by 10+ agent developers

---

## Phase 10: Admin Dashboard (Week 13)

### Objectives
- Customer service tools
- Dispute resolution
- Refund processing
- User moderation

### Tasks

#### Week 13: Admin Tools
- [ ] Create admin dashboard layout
- [ ] Build order management interface
- [ ] Create `admin-refund` edge function
- [ ] Build refund processing UI
- [ ] Create `admin-flag` user function
- [ ] Build user suspension interface
- [ ] Create dispute resolution workflow
- [ ] Build message moderation tools
- [ ] Create `admin-trade-review` function
- [ ] Build trade dispute interface
- [ ] Implement admin role-based access
- [ ] Create admin activity logging
- [ ] Build analytics dashboard
- [ ] Create customer support ticket system
- [ ] Write admin user documentation

### Deliverables
✅ Full admin dashboard  
✅ Refund processing tools  
✅ User moderation system  
✅ Dispute resolution workflow  

### Success Metrics
- Refund processing time < 10 minutes
- Dispute resolution time < 48 hours
- Admin tool performance < 500ms
- Zero unauthorized access incidents

---

## Phase 11: Mobile Apps (Week 14)

### Objectives
- iOS app via Capacitor
- Android app via Capacitor
- Push notifications
- App Store submission

### Tasks

#### Week 14: Mobile Development
- [ ] Add Capacitor to project (`npm install @capacitor/core @capacitor/cli`)
- [ ] Initialize iOS platform (`npx cap add ios`)
- [ ] Initialize Android platform (`npx cap add android`)
- [ ] Configure `capacitor.config.ts`
- [ ] Set up push notifications
- [ ] Implement deep linking
- [ ] Add biometric authentication
- [ ] Configure secure storage for tokens
- [ ] Design app icons (1024x1024 for iOS, 512x512 for Android)
- [ ] Create splash screens
- [ ] Build iOS app in Xcode
- [ ] Build Android app in Android Studio
- [ ] Test on physical devices (iPhone, Android)
- [ ] Create App Store screenshots
- [ ] Create Play Store screenshots
- [ ] Write app descriptions
- [ ] Submit to App Store (TestFlight first)
- [ ] Submit to Play Store (Internal testing first)

### Deliverables
✅ iOS app (TestFlight)  
✅ Android app (Internal testing)  
✅ Push notifications working  
✅ Deep linking functional  

### Success Metrics
- App build success rate 100%
- App crashes < 0.1%
- Push notification delivery > 95%
- App Store approval on first submission

---

## Phase 12: Cloudflare Setup (Week 15)

### Objectives
- Migrate DNS to Cloudflare
- Configure CDN caching
- Set up WAF rules
- Enable DDoS protection

### Tasks

#### Week 15: Infrastructure
- [ ] Transfer DNS to Cloudflare
- [ ] Point A record to Lovable Cloud
- [ ] Configure SSL/TLS (Full Strict mode)
- [ ] Enable Always Use HTTPS
- [ ] Set up caching rules for static assets
- [ ] Configure bypass for API routes
- [ ] Enable Brotli compression
- [ ] Enable HTTP/2 and HTTP/3
- [ ] Configure WAF basic rules
- [ ] Set up rate limiting (100 req/10sec)
- [ ] Enable DDoS protection
- [ ] Configure bot management
- [ ] Set up page rules (3 rules)
- [ ] Test cache hit rates
- [ ] Optimize caching policies
- [ ] Configure Cloudflare analytics
- [ ] Set up alerting for downtime
- [ ] Test failover scenarios

### Deliverables
✅ DNS on Cloudflare  
✅ CDN caching active  
✅ WAF rules configured  
✅ DDoS protection enabled  

### Success Metrics
- Cache hit rate > 80% for static assets
- Page load time improved by 40%+
- Zero DDoS incidents
- WAF blocks 99%+ of malicious traffic

---

## Phase 13: Bundles & Polish (Week 16)

### Objectives
- Bundle creation system
- Final bug fixes
- Performance optimization
- Launch preparation

### Tasks

#### Week 16: Final Touches
- [ ] Create bundles table and functions
- [ ] Build `BundleCreator` component
- [ ] Implement bundle pricing algorithm
- [ ] Create bundle shipping calculations
- [ ] Add bundle filters to search
- [ ] Build bundle detail pages
- [ ] Fix all critical bugs
- [ ] Resolve all P0 and P1 issues
- [ ] Optimize database queries (target <100ms)
- [ ] Reduce JavaScript bundle size
- [ ] Improve mobile performance
- [ ] Run load tests (1000 concurrent users)
- [ ] Security audit (pen testing)
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Final QA pass on all features
- [ ] Update all documentation
- [ ] Create launch announcement
- [ ] Prepare marketing materials

### Deliverables
✅ Bundle system functional  
✅ All critical bugs fixed  
✅ Performance optimized  
✅ Ready for public launch  

### Success Metrics
- Zero P0 bugs
- Zero P1 bugs
- Load test passes at 1000 users
- Security audit: zero critical vulnerabilities
- Lighthouse score > 90

---

## Launch Checklist

### Pre-Launch (Week 16)

**Technical:**
- [ ] All 45+ edge functions deployed
- [ ] All database migrations applied
- [ ] All RLS policies tested
- [ ] Stripe Connect fully configured
- [ ] Pokemon TCG API syncing daily
- [ ] All 4 shipping carriers integrated
- [ ] Cloudflare configured and tested
- [ ] SSL certificates verified
- [ ] Mobile apps in TestFlight/Internal Testing
- [ ] ACP endpoints functional
- [ ] MCP server operational
- [ ] Admin dashboard accessible
- [ ] Email notifications working
- [ ] Push notifications configured

**Business:**
- [ ] Terms of Service finalized
- [ ] Privacy Policy updated
- [ ] Refund policy documented
- [ ] Seller fees structure defined
- [ ] Customer support team trained
- [ ] Knowledge base articles written
- [ ] Launch marketing plan ready
- [ ] Press kit prepared
- [ ] Influencer partnerships confirmed

**Monitoring:**
- [ ] Sentry error tracking configured
- [ ] LogRocket session replay enabled
- [ ] Plausible analytics installed
- [ ] Mixpanel event tracking set up
- [ ] Uptime monitoring configured (UptimeRobot)
- [ ] Database backup automation tested
- [ ] Incident response runbook documented

### Launch Day

**Go-Live Sequence:**
1. Final database backup
2. Deploy latest code to production
3. Run smoke tests on all critical paths
4. Enable Cloudflare caching
5. Publish mobile apps to public tracks
6. Send launch announcement email
7. Post on social media
8. Monitor error rates and performance
9. Be ready for support inquiries

### Post-Launch (Week 17+)

**Week 1:**
- [ ] Daily error rate monitoring
- [ ] Daily performance review
- [ ] Respond to all user feedback
- [ ] Fix any critical launch bugs
- [ ] Scale infrastructure if needed
- [ ] Review analytics daily

**Week 2-4:**
- [ ] Weekly performance reviews
- [ ] Iterate on AI models based on data
- [ ] Optimize top slow queries
- [ ] Improve low-performing features
- [ ] Gather user testimonials
- [ ] Plan Phase 2 features

---

## Risk Management

### High-Risk Items

| Risk | Impact | Mitigation |
|------|--------|------------|
| Stripe integration issues | High | Extensive testing, sandbox first, backup payment provider |
| AI model accuracy low | High | Use established APIs (OpenAI), train with real data, human fallback |
| Shipping API downtime | Medium | Multi-carrier support, manual label fallback |
| Fake card detection false positives | Medium | Human review queue, seller appeals, continuous model improvement |
| Database performance issues | High | Proper indexing, query optimization, read replicas if needed |
| Mobile app rejection | Medium | Follow guidelines strictly, prepare for appeals, beta test thoroughly |

### Contingency Plans

**If behind schedule:**
1. Prioritize core features (listing, purchasing, wallet)
2. Defer nice-to-have features (bundles, feed)
3. Reduce scope of Phase 1 release
4. Plan features for Phase 2

**If critical bug in production:**
1. Rollback to previous stable version
2. Fix bug in development
3. Deploy hotfix
4. Post-mortem to prevent recurrence

**If third-party API fails:**
1. Implement graceful degradation
2. Use cached data when available
3. Show user-friendly error messages
4. Have manual workarounds documented

---

## Success Criteria

### Launch Targets (End of Week 16)

**Product Readiness:**
- ✅ All 16 core systems functional
- ✅ Zero P0 bugs, < 5 P1 bugs
- ✅ Mobile apps submitted to stores
- ✅ 99.9% uptime in pre-launch testing
- ✅ Load tested for 1,000 concurrent users

**User Experience:**
- ✅ Listing creation < 3 minutes
- ✅ Checkout completion rate > 80%
- ✅ Page load time < 2 seconds
- ✅ Mobile app rating > 4.0 stars
- ✅ Customer support response < 4 hours

**Business Metrics (First 30 Days):**
- Target: 1,000 registered users
- Target: 500 listings created
- Target: 100 completed transactions
- Target: £10,000 GMV
- Target: 20% wallet adoption
- Target: 10% trade offer usage

### Long-Term Vision (6-12 Months)

**Growth:**
- 50,000+ users
- £5M annual GMV
- 60% wallet adoption
- 30% trades include trade offers
- 500+ daily agent transactions via ACP

**Expansion:**
- US market launch
- Sports cards vertical
- Grading service integration
- European expansion
- B2B enterprise tools

---

## Summary

This 16-week roadmap delivers a complete, production-ready AI-native trading card marketplace with:

- ✅ 16 major feature systems
- ✅ 45+ edge functions
- ✅ Mobile apps on iOS & Android
- ✅ Full ACP & MCP protocol support
- ✅ Comprehensive admin tools
- ✅ Scalable infrastructure

**Current Status:** Planning complete, ready to begin implementation  
**Start Date:** TBD  
**Target Launch:** Week 16  
**First Review:** End of Phase 1 (Week 2)

---

**Document Version:** 1.0  
**Last Updated:** 2025-11-19  
**Next Update:** After Phase 1 completion
