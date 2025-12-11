# 6Seven Changelog

All notable changes to this project will be documented in this file.

---

## [Unreleased] - December 2024

### Added

#### iOS App - Major Features
- **Bundle Purchases** - Buy multiple cards from the same seller with combined shipping
- **Seller Analytics Dashboard** - Track your sales, views, and conversion rates with interactive charts
- **AI Vibe Search** - Natural language search ("show me vintage Pikachu cards")
- **Image Search** - Upload a photo to find matching cards
- **Rating System** - Rate buyers and sellers after transactions
- **Dispute Resolution** - File and track disputes for problematic orders

#### Sell Flow Improvements
- **Quick List Mode** - New 4-step wizard for faster card listings
- **Batch Listing Mode** - Rapid-fire listing for multiple cards
- **Voice Search** - Speak to search for cards during listing creation
- **Swipe Navigation** - Swipe between wizard steps on mobile
- **Haptic Feedback** - Tactile feedback throughout the app

#### Wallet System
- **Wallet Pricing Page** - Clear explanation of wallet benefits vs card payments
- **No Buyer Fees** - Wallet purchases have zero buyer fees
- **Deposit Bonuses** - Get bonus credit when depositing (2% on £50, 3% on £100, 5% on £200)
- **Savings Calculator** - See exactly how much you save using wallet

#### Admin Tools
- **Auto-Running Bulk Actions** - Admin bulk operations now run automatically
- **Missing English Names Filter** - Filter cards missing English name translations
- **Card Data Fixes** - Fixed search_vector to include English names

#### A/B Testing
- **Sell Flow Testing** - Infrastructure for testing different sell flow variations
- **Feature Flags** - Rollout new features to specific user segments

### Fixed

- Fixed TCGdex image URL typos (`tcgdx` → `tcgdex`)
- Fixed English name display in card capture step
- Fixed pokemon-search edge function for English name support
- Fixed broken route in BankAccountSelector
- Fixed image URL format in fetch-missing-images function

### Changed

#### Code Quality (Overnight Refactoring)
- Replaced all `console.log/warn/error` with centralized logger utility
- Removed 17 unused components and 1 unused hook
- Fixed TypeScript `any` types in admin components
- Created centralized `query-keys.ts` for React Query cache keys
- Created unified card types (`src/types/card.ts`)
- Created common types (`src/types/common.ts`)

### Documentation

- **WALLET_PRICING_STRATEGY.md** - Comprehensive wallet fee strategy
- **PERFORMANCE_OPTIMIZATIONS.md** - React optimization recommendations
- **API_IMPROVEMENTS.md** - Future API integration roadmap

---

## Previous Updates

### December 9, 2024
- Image validation migration
- Setup instructions for fetch-missing-images

### Earlier
- Initial iOS app release with Expo
- Stripe Connect seller onboarding
- SendCloud shipping integration
- AI-powered fraud detection
- Real-time messaging system

---

## Coming Soon

- **Apple Pay / Google Pay** - Express checkout on mobile
- **Push Notifications** - Real-time alerts for offers and messages
- **AI Condition Grading** - Automated card condition assessment
- **TCGPlayer API** - Real-time market pricing
- **Price Predictions** - 7-day and 30-day price forecasts
- **Auction System** - Time-based bidding for rare cards
