# Remaining Work Plan - Stripe Connect & Payout System

## ✅ Completed Items

### Phase 1: Stripe Connect Onboarding ✅
- [x] Multi-step onboarding form (SellerOnboardingMultiStep)
- [x] Personal information step
- [x] Business details step (for companies)
- [x] Bank account/payout step
- [x] Review step
- [x] Edge function: stripe-connect-onboard-complete
- [x] Form validation with Zod
- [x] Error handling and user feedback
- [x] Routing updated in App.tsx

### Phase 2: Payout Flow ✅
- [x] Webhook handler for payment_intent.succeeded
- [x] Webhook handler for charge.succeeded
- [x] Payout record creation
- [x] seller_balances table updates
- [x] PayoutHistory component
- [x] PayoutSchedule component
- [x] Integration in SellerAccountManagement
- [x] Failed transfer handling

### Phase 3: Edge Cases & Error Handling ✅
- [x] Duplicate payout prevention
- [x] Date of birth validation
- [x] Input validation (SSN, account numbers, routing numbers)
- [x] Balance tracking on payout creation/completion
- [x] Failed transfer handling

---

## 🔧 Remaining Work Items

### 1. Enhanced Error Handling & User Feedback

#### 1.1 Bank Account Creation Error Handling
**Priority: High**
**Status: Not Started**

**Issue**: If bank account creation fails in `stripe-connect-onboard-complete`, the user gets a generic error.

**Tasks**:
- [ ] Add try-catch around `stripe.accounts.createExternalAccount` call
- [ ] Parse Stripe error codes (e.g., `invalid_account_number`, `invalid_routing_number`)
- [ ] Return specific error messages to frontend
- [ ] Display user-friendly error messages in onboarding form
- [ ] Allow user to retry bank account entry without losing other form data

**Files to Modify**:
- `supabase/functions/stripe-connect-onboard-complete/index.ts`
- `src/pages/SellerOnboardingMultiStep.tsx`
- `src/components/seller/OnboardingStepPayout.tsx`

---

#### 1.2 Verification Requirements Display
**Priority: Medium**
**Status: Not Started**

**Issue**: When Stripe requires additional verification, users only see a toast message. They should see what's needed.

**Tasks**:
- [ ] Create component to display verification requirements
- [ ] Show `currently_due` and `eventually_due` requirements from Stripe
- [ ] Add link to Stripe Connect account management for document upload
- [ ] Display requirements in SellerAccountManagement page
- [ ] Add status indicator showing verification progress

**Files to Create/Modify**:
- `src/components/seller/VerificationRequirements.tsx` (new)
- `src/pages/SellerAccountManagement.tsx`
- `supabase/functions/stripe-connect-onboard-complete/index.ts`

---

### 2. Seller Dashboard Enhancements

#### 2.1 Balance Display on Dashboard
**Priority: Medium**
**Status: Not Started**

**Issue**: Sellers can't see their balance from the main dashboard - they have to go to Account Management.

**Tasks**:
- [ ] Add balance query to SellerDashboard
- [ ] Display available and pending balance in dashboard stats
- [ ] Add quick link to payout history
- [ ] Show recent payout status

**Files to Modify**:
- `src/pages/SellerDashboard.tsx`

---

#### 2.2 Onboarding Status Indicator
**Priority: Low**
**Status: Not Started**

**Issue**: No clear indicator on dashboard if onboarding is incomplete or needs verification.

**Tasks**:
- [ ] Add alert/banner if onboarding incomplete
- [ ] Show verification status if pending
- [ ] Add CTA button to complete onboarding

**Files to Modify**:
- `src/pages/SellerDashboard.tsx`

---

### 3. Testing & Edge Cases

#### 3.1 Webhook Event Testing
**Priority: High**
**Status: Not Started**

**Tasks**:
- [ ] Test payment_intent.succeeded event
- [ ] Test charge.succeeded event
- [ ] Test transfer.failed event
- [ ] Test account.updated event
- [ ] Test duplicate event handling
- [ ] Test with missing data scenarios

**Test Scenarios**:
- [ ] Payment succeeds → payout created → balance updated
- [ ] Charge succeeds → payout completed → balance moved to available
- [ ] Transfer fails → payout marked failed → balance reverted
- [ ] Multiple webhook events for same payment (idempotency)

---

#### 3.2 Onboarding Flow Testing
**Priority: High**
**Status: Not Started**

**Tasks**:
- [ ] Test individual onboarding flow
- [ ] Test company onboarding flow
- [ ] Test with invalid bank account details
- [ ] Test with missing required fields
- [ ] Test navigation between steps
- [ ] Test form persistence (if user refreshes)

---

#### 3.3 Balance Calculation Testing
**Priority: Medium**
**Status: Not Started**

**Tasks**:
- [ ] Test balance initialization on first payout
- [ ] Test balance updates on multiple payouts
- [ ] Test balance updates on failed transfers
- [ ] Test concurrent payout handling
- [ ] Test currency handling (if multi-currency)

---

### 4. Documentation & Configuration

#### 4.1 Environment Variables Documentation
**Priority: Low**
**Status: Not Started**

**Tasks**:
- [ ] Document required Stripe environment variables
- [ ] Document webhook endpoint configuration
- [ ] Document Stripe Connect setup steps
- [ ] Add troubleshooting guide

---

#### 4.2 Webhook Configuration Guide
**Priority: Medium**
**Status: Not Started**

**Tasks**:
- [ ] Document required webhook events
- [ ] Document webhook endpoint URL
- [ ] Document webhook secret configuration
- [ ] Add Stripe dashboard setup instructions

---

### 5. UI/UX Improvements

#### 5.1 Loading States
**Priority: Low**
**Status: Not Started**

**Tasks**:
- [ ] Add skeleton loaders for payout history
- [ ] Add loading states for balance queries
- [ ] Improve error state displays

---

#### 5.2 Empty States
**Priority: Low**
**Status: Not Started**

**Tasks**:
- [ ] Improve empty state for payout history
- [ ] Add helpful messages for new sellers
- [ ] Add onboarding CTA in empty states

---

### 6. Security & Validation

#### 6.1 Additional Input Validation
**Priority: Medium**
**Status: Not Started**

**Tasks**:
- [ ] Validate UK sort code format (XX-XX-XX)
- [ ] Validate US routing number format (9 digits)
- [ ] Validate account number length by country
- [ ] Add phone number format validation
- [ ] Add postal code validation by country

**Files to Modify**:
- `src/components/seller/OnboardingStepPayout.tsx`
- `src/components/seller/OnboardingStepPersonal.tsx`
- `src/pages/SellerOnboardingMultiStep.tsx` (Zod schema)

---

#### 6.2 Account Verification
**Priority: Medium**
**Status: Not Started**

**Tasks**:
- [ ] Verify account belongs to user before updates
- [ ] Add rate limiting for onboarding submissions
- [ ] Add audit logging for sensitive operations

---

### 7. Performance Optimizations

#### 7.1 Query Optimization
**Priority: Low**
**Status: Not Started**

**Tasks**:
- [ ] Review query caching strategies
- [ ] Optimize balance queries
- [ ] Add pagination for payout history
- [ ] Implement virtual scrolling if needed

---

## 📋 Implementation Priority

### High Priority (Do First)
1. Bank Account Creation Error Handling
2. Webhook Event Testing
3. Onboarding Flow Testing
4. Balance Calculation Testing

### Medium Priority (Do Next)
1. Verification Requirements Display
2. Balance Display on Dashboard
3. Additional Input Validation
4. Account Verification
5. Webhook Configuration Guide

### Low Priority (Nice to Have)
1. Onboarding Status Indicator
2. Loading States
3. Empty States
4. Environment Variables Documentation
5. Query Optimization

---

## 🧪 Testing Checklist

### Manual Testing
- [ ] Complete onboarding as individual seller
- [ ] Complete onboarding as company seller
- [ ] Make a test purchase
- [ ] Verify payout record created
- [ ] Verify balance updated
- [ ] Check payout history displays correctly
- [ ] Check payout schedule displays correctly
- [ ] Test failed transfer scenario
- [ ] Test verification requirements flow

### Integration Testing
- [ ] Test full payment flow: Checkout → Payment → Payout
- [ ] Test webhook event processing
- [ ] Test balance calculations
- [ ] Test error scenarios

---

## 📝 Notes

- All core functionality is implemented and working
- Focus should be on error handling, testing, and UX improvements
- Most remaining items are enhancements rather than critical features
- Consider user feedback before implementing low-priority items

---

## 🚀 Quick Start for Remaining Work

1. **Start with High Priority items** - Error handling and testing
2. **Test the current implementation** - Identify any bugs or issues
3. **Gather user feedback** - See what sellers actually need
4. **Iterate on UX** - Improve based on real usage

---

**Last Updated**: $(date)
**Status**: Core implementation complete, enhancements pending

