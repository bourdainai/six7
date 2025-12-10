# 6Seven - AI-Native Trading Card Marketplace

## Overview
6Seven is a UK-focused marketplace for Pokémon TCG (Trading Card Game) cards. The platform enables buyers and sellers to trade cards with features like wallet payments, shipping integration, and AI-powered features.

## Tech Stack
- **Frontend:** React 18 + TypeScript, Vite 7, Tailwind CSS, Radix UI (shadcn/ui)
- **Backend:** Supabase (PostgreSQL + 153 Edge Functions)
- **Payments:** Stripe Connect (seller payouts), Wallet system
- **Shipping:** SendCloud API integration
- **Hosting:** Lovable Cloud (abstracts Supabase)

## Key Architecture

### Frontend Structure
```
src/
├── components/     # 161 React components
├── pages/          # 43 route pages
├── hooks/          # 24 custom hooks
├── lib/            # Utilities (logger, mcp, acp)
├── integrations/   # Supabase client & types
└── types/          # TypeScript definitions
```

### Backend (Edge Functions)
```
supabase/functions/
├── create-checkout/        # Stripe payment flow
├── wallet-purchase/        # Wallet balance payments
├── calculate-fees/         # Tiered fee calculation
├── sendcloud-*/            # Shipping label generation
├── stripe-*/               # Stripe Connect & webhooks
├── calculate-seller-reputation/  # Seller scoring
└── 140+ more functions
```

## Important Patterns

### Logging
Use the logger utility instead of console.log:
```typescript
import { logger } from "@/lib/logger";
logger.debug("Debug info", data);
logger.info("Info message");
logger.warn("Warning");
logger.error("Error", error);
```

### Database Access
- No direct PostgreSQL access (Lovable abstraction)
- All DB operations through Supabase client
- Migrations run through Lovable platform

### Git Workflow
Claude Code pushes to `claude/*` branches only. To deploy:
1. Claude pushes to feature branch
2. User tells Cursor to merge to main
3. Lovable auto-syncs from main

## Key Features

### Wallet System
- `wallet_accounts` - User balances
- `wallet_transactions` - Transaction history
- `wallet_withdrawals` - Payout requests to bank

### Seller Onboarding
- Stripe Connect integration
- Route: `/seller/onboarding`
- Profile fields: `stripe_connect_account_id`, `can_receive_payments`

### Checkout Flow
- Single item: `/checkout/:listingId`
- Variants: `/checkout/:listingId?variant=:id`
- Bundle (same listing): `/checkout/:listingId?type=bundle`

### Bundles
Two types exist:
1. **Listing variants** - Multiple cards in same listing (handled by checkout)
2. **Bundle entity** - Multiple listings grouped (bundles table)

## Common Tasks

### Finding Code
- Components: `src/components/`
- Pages: `src/pages/`
- Edge functions: `supabase/functions/`
- Types: `src/integrations/supabase/types.ts`

### Testing Changes
- Frontend: Lovable auto-deploys on main push
- Edge functions: Deploy via Lovable

## Secrets & Environment
Configured in Lovable (not retrievable):
- `STRIPE_SECRET_KEY`
- `SENDCLOUD_PUBLIC_KEY` / `SENDCLOUD_SECRET_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
