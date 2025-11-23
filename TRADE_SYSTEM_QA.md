# Trading System - Complete QA Checklist

## ✅ Phase 5 Complete: Mobile & Polish

### What Was Built

#### Mobile Components
- **MobileTradeBuilder**: Touch-optimized trade interface with bottom sheets
- **useMobileDetect**: Hook to detect device type and conditionally render components  
- **TradePerformanceMonitor**: Performance tracking for slow renders and memory usage

#### Integration
- ListingDetail now conditionally renders Mobile vs Desktop trade builders
- Responsive design that adapts to screen size

---

## 🔧 Critical Fixes Applied

### 1. **Database Foreign Keys** ✅ FIXED
- **Issue**: trade_offers referenced auth.users instead of profiles
- **Fix**: Updated foreign keys to reference public.profiles
- **Impact**: PostgREST can now properly join and return buyer/seller data

### 2. **Field Naming Consistency** ✅ FIXED  
- **Issue**: Mismatch between camelCase and snake_case
- **Fix**: Updated trade-create edge function and TradeBuilderModal to use snake_case
- **Impact**: Validation now works correctly

---

## 📋 Complete Testing Checklist

### Phase 1: Trade Builder & Creation
- [ ] **Open trade modal** from listing detail page
- [ ] **Add cards** to your offer
  - Should show your active listings
  - Can't add same card twice
  - Cards display with image, title, price
- [ ] **Add cash** amount
  - Quick buttons work (+£5, +£10, etc)
  - Manual input works
  - Can't go negative
- [ ] **AI Fairness evaluation**
  - Shows score 0-1
  - Updates when cards/cash changes
  - Displays suggestions
- [ ] **Submit trade offer**
  - Success toast appears
  - Offer appears in Trade Offers page
  - Seller receives notification

### Phase 2: Negotiation System
- [ ] **View incoming offers** (as seller)
  - See all offer details
  - View fairness score
  - See buyer's cards and cash
- [ ] **Accept offer**
  - Confirmation dialog
  - Order created
  - Listings marked as sold
  - Escrow handled if cash involved
- [ ] **Reject offer**
  - Offer status changes
  - Both parties notified
- [ ] **Counter offer**
  - Can modify cards and cash
  - AI re-evaluates fairness
  - Negotiation round increments
  - Previous offer linked
- [ ] **Trade chat**
  - Real-time messaging
  - File attachments
  - Message history persists
- [ ] **Offer expiration**
  - Timer counts down
  - Expired offers can't be accepted
  - Auto-rejection on expiry

### Phase 3: Advanced Features
- [ ] **Save trade templates**
  - Quick access to common offers
  - Load template auto-fills cards/cash
- [ ] **Trade packages**
  - Combine multiple cards into package
  - Offer entire package in one trade
- [ ] **Auto-accept rules**
  - Set minimum fairness score
  - Auto-accept qualifying offers
  - Notifications sent
- [ ] **Seller badges**
  - Earned after milestones
  - Display on profile
  - Boost trust score
- [ ] **Trade statistics**
  - Total trades completed
  - Average fairness score
  - Success rate
  - Trade value stats

### Phase 4: Analytics & Insights  
- [ ] **Portfolio analytics**
  - Health score calculation
  - Diversification metrics
  - Top cards by value
  - Optimization suggestions
- [ ] **Market trends**
  - Price trends by card
  - Volume data
  - Trending cards
  - Market insights
- [ ] **AI Recommendations**
  - Personalized trade suggestions
  - Based on inventory + preferences
  - Fair value matches
- [ ] **Analytics dashboard**
  - Visual charts
  - Filter by date range
  - Export data

### Phase 5: Mobile & Performance
- [ ] **Mobile trade builder**
  - Bottom sheet UI
  - Touch-friendly card selection
  - Collapsible sections
  - Sticky submit button
- [ ] **Responsive design**
  - Works on all screen sizes
  - No horizontal scroll
  - Touch targets 44px+
- [ ] **Performance**
  - No slow renders (>16ms)
  - Smooth scrolling
  - Fast card search
  - No memory leaks

---

## 🐛 Known Issues to Watch For

### High Priority
1. **Image uploads**: Check if photos can be added to trade offers
2. **Real-time updates**: Verify chat messages and offer status updates work
3. **Escrow release**: Test cash trades trigger escrow correctly
4. **Badge awarding**: Confirm badges are granted after milestones

### Medium Priority  
1. **Template loading**: Verify saved templates populate correctly
2. **Counter offer chain**: Test multiple rounds of negotiation
3. **Analytics calculations**: Ensure stats are accurate
4. **Market trend updates**: Check daily trend calculations run

### Low Priority
1. **Performance monitoring**: Review console for slow render warnings
2. **Mobile gestures**: Test swipe actions if implemented
3. **Notification preferences**: Check user can customize alerts

---

## 🔍 Edge Cases to Test

1. **Trading with self**: Should be blocked (is in validation)
2. **Expired offers**: Can't be accepted or countered
3. **Inactive listings**: Can't be traded
4. **No inventory**: Trade creation should prompt to list items first
5. **Network failures**: Proper error handling and retry logic
6. **Concurrent offers**: Multiple users offering on same item
7. **Price changes**: If listing price changes during negotiation
8. **Empty trades**: Can't submit with zero cards and zero cash

---

## 🎯 Performance Benchmarks

- **Trade modal open**: < 100ms
- **AI fairness calc**: < 2s
- **Card search**: < 500ms  
- **Offer submission**: < 3s
- **Page load (Trade Offers)**: < 1s

---

## 🚀 Post-QA Actions

After testing, consider:
1. Add onboarding tooltip tour for first-time traders
2. Implement trade feedback/rating system
3. Add "Quick Trade" for popular card swaps
4. Build trade marketplace for public offers
5. Add trade history export
6. Implement trade insurance/protection

---

## 📊 Metrics to Track

- Trade completion rate
- Average negotiation rounds
- Most traded cards
- User satisfaction scores
- Time to complete trade
- Dispute rate

---

## Security Checks

- [ ] RLS policies prevent unauthorized access
- [ ] Input validation on all fields
- [ ] SQL injection protection
- [ ] XSS prevention in chat
- [ ] File upload validation
- [ ] Rate limiting on trade creation

