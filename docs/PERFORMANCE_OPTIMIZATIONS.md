# Performance Optimization Guide

## Overview

This document outlines performance optimization opportunities identified in the 6Seven codebase.

## Current State

- **React.memo usage:** Only 8 instances across 200+ components
- **useMemo usage:** 74 instances
- **useCallback usage:** Limited
- **Code splitting:** Good foundation with lazy loading on 44+ routes

## Priority 1: Critical (High Impact, Quick Wins)

### 1.1 Wrap Large Pages in React.memo

**Target files:**
- `src/pages/SellItem.tsx` (2114 lines) - Massive form, re-renders on every state change
- `src/pages/Messages.tsx` (792 lines) - Re-renders on every keystroke
- `src/pages/AdminCardCatalog.tsx` (529 lines) - Re-renders grid on filter change

**Implementation:**
```typescript
// Before
export function SellItem() { ... }

// After
export const SellItem = memo(function SellItem() { ... });
```

**Impact:** 30-40% reduction in unnecessary renders

### 1.2 Add useCallback to Event Handlers

**Target: SellItem.tsx**
```typescript
// Before
const handleMagicSearchSelect = (cardData) => { ... };

// After
const handleMagicSearchSelect = useCallback((cardData) => { ... }, [dependencies]);
```

**Functions to wrap:**
- `handleMagicSearchSelect`
- `handleImageUpload`
- `handlePriceChange`
- `handleConditionSelect`

**Impact:** 20-30% re-render reduction for child components

### 1.3 Lazy Load Modal Components

**Target modals:**
- `DuplicateCleanupModal`
- `CardDetailModal`
- `TradeOfferModal`
- Admin dialogs

**Implementation:**
```typescript
const DuplicateCleanupModal = lazy(() =>
  import("@/components/admin/DuplicateCleanupModal")
);

// Usage
<Suspense fallback={<Skeleton />}>
  {showModal && <DuplicateCleanupModal />}
</Suspense>
```

**Impact:** 50-100KB bundle reduction per modal

## Priority 2: High Impact

### 2.1 Parallelize Checkout Queries

**File:** `src/pages/Checkout.tsx`

**Current:** 5 sequential useQuery calls
**Recommended:** useQueries for parallel execution

```typescript
const results = useQueries({
  queries: [
    { queryKey: ["listing", id], queryFn: fetchListing },
    { queryKey: ["variant", variantId], queryFn: fetchVariant },
    { queryKey: ["bundleVariants", bundleType], queryFn: fetchBundleVariants },
    { queryKey: ["offer", offerId], queryFn: fetchOffer },
    { queryKey: ["fees", id], queryFn: fetchFees },
  ]
});
```

**Impact:** 300-500ms faster checkout page load

### 2.2 Add useMemo for Expensive Calculations

**Targets:**
- `src/pages/Orders.tsx` - Order filtering by status
- `src/pages/ListingDetail.tsx` - Variant sorting
- `src/components/SearchFilters.tsx` - Filter computations

```typescript
const filteredOrders = useMemo(() =>
  orders.filter(o => o.status === selectedStatus),
  [orders, selectedStatus]
);
```

### 2.3 Image Optimization

**Implement srcset for responsive images:**
```typescript
<img
  src={imageUrl}
  srcSet={`
    ${imageUrl}?w=200 200w,
    ${imageUrl}?w=400 400w,
    ${imageUrl}?w=600 600w
  `}
  sizes="(max-width: 640px) 200px, (max-width: 1024px) 400px, 600px"
  loading="lazy"
  decoding="async"
/>
```

## Priority 3: Medium Impact

### 3.1 Split Large Components

**SellItem.tsx refactoring:**
```
src/pages/SellItem.tsx (wrapper only)
├── src/components/sell/SellItemHeader.tsx
├── src/components/sell/CardSelection.tsx
├── src/components/sell/PricingSection.tsx
├── src/components/sell/ShippingDetails.tsx
└── src/components/sell/PublishButton.tsx
```

### 3.2 Prefetch Related Data

```typescript
// In ListingDetail.tsx
useEffect(() => {
  if (listing?.seller_id) {
    queryClient.prefetchQuery({
      queryKey: ["seller-listings", listing.seller_id],
      queryFn: () => fetchSellerListings(listing.seller_id),
    });
  }
}, [listing?.seller_id]);
```

### 3.3 Query Cache Optimization

**Different stale times for different data:**
```typescript
// Trending listings (frequently changing)
staleTime: 30 * 1000 // 30 seconds

// User profile (rarely changes)
staleTime: 5 * 60 * 1000 // 5 minutes

// Card catalog (static)
staleTime: 30 * 60 * 1000 // 30 minutes
```

## Bundle Optimization

### Current Chunking (Good)
```javascript
// vite.config.ts
manualChunks: {
  'react-vendor': ['react', 'react-dom', 'react-router-dom'],
  'query-vendor': ['@tanstack/react-query'],
  'ui-vendor': ['@radix-ui/react-dialog', ...],
  'stripe-vendor': ['@stripe/...'],
  'recharts': ['recharts'],
  'mapbox': ['mapbox-gl'],
  'supabase': ['@supabase/supabase-js'],
}
```

### Recommendations
1. Lower `chunkSizeWarningLimit` from 500KB to 250KB
2. Lazy load `recharts` and `mapbox-gl` only on admin pages
3. Tree-shake unused Radix UI components

## Metrics to Track

| Metric | Current | Target |
|--------|---------|--------|
| First Contentful Paint | ~2.5s | <1.5s |
| Largest Contentful Paint | ~4s | <2.5s |
| Time to Interactive | ~5s | <3s |
| Bundle Size (main) | ~500KB | <300KB |

## Implementation Timeline

1. **Week 1:** React.memo + useCallback (Quick wins)
2. **Week 2:** Query parallelization + prefetching
3. **Week 3:** Component splitting + lazy loading
4. **Week 4:** Image optimization + bundle analysis
