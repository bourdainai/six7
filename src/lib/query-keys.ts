/**
 * Centralized React Query keys for consistent cache management
 *
 * Usage:
 * import { queryKeys } from "@/lib/query-keys";
 *
 * useQuery({
 *   queryKey: queryKeys.seller.reputation(sellerId),
 *   ...
 * });
 */

export const queryKeys = {
  // User/Profile related
  profile: (userId: string) => ["profile", userId] as const,
  profiles: () => ["profiles"] as const,

  // Seller related
  seller: {
    all: () => ["seller"] as const,
    detail: (sellerId: string) => ["seller", sellerId] as const,
    reputation: (sellerId: string) => ["seller-reputation", sellerId] as const,
    badges: (sellerId: string) => ["seller-badges", sellerId] as const,
    stats: (sellerId: string) => ["seller-stats", sellerId] as const,
    listings: (sellerId: string) => ["seller-listings", sellerId] as const,
    verification: (sellerId: string) => ["seller-verification", sellerId] as const,
  },

  // Listings related
  listings: {
    all: () => ["listings"] as const,
    search: (filters: Record<string, unknown>) => ["listings", "search", filters] as const,
    detail: (listingId: string) => ["listing", listingId] as const,
    variants: (listingId: string) => ["listing-variants", listingId] as const,
    images: (listingId: string) => ["listing-images", listingId] as const,
    similar: (listingId: string) => ["similar-listings", listingId] as const,
    forSeller: (sellerId: string) => ["listings", "seller", sellerId] as const,
  },

  // Orders related
  orders: {
    all: () => ["orders"] as const,
    buyer: (userId: string) => ["orders", "buyer", userId] as const,
    seller: (userId: string) => ["orders", "seller", userId] as const,
    detail: (orderId: string) => ["order", orderId] as const,
    forRating: (orderId: string) => ["order-for-rating", orderId] as const,
    forDispute: (orderId: string) => ["order-for-dispute", orderId] as const,
  },

  // Wallet related
  wallet: {
    account: (userId: string) => ["wallet", userId] as const,
    transactions: (userId: string) => ["wallet-transactions", userId] as const,
    withdrawals: (userId: string) => ["wallet-withdrawals", userId] as const,
    bankAccounts: (userId: string) => ["bank-accounts", userId] as const,
  },

  // Messages related
  messages: {
    all: () => ["messages"] as const,
    conversations: (userId: string) => ["conversations", userId] as const,
    conversation: (conversationId: string) => ["conversation", conversationId] as const,
    unread: (userId: string) => ["unread-messages", userId] as const,
  },

  // Bundles related
  bundles: {
    all: () => ["bundles"] as const,
    detail: (bundleId: string) => ["bundle", bundleId] as const,
    forSeller: (sellerId: string) => ["bundles", "seller", sellerId] as const,
  },

  // Trade offers related
  trades: {
    all: () => ["trades"] as const,
    received: (userId: string) => ["trades", "received", userId] as const,
    sent: (userId: string) => ["trades", "sent", userId] as const,
    detail: (tradeId: string) => ["trade", tradeId] as const,
  },

  // Ratings/Reviews related
  ratings: {
    forSeller: (sellerId: string) => ["ratings", "seller", sellerId] as const,
    forListing: (listingId: string) => ["ratings", "listing", listingId] as const,
    existing: (orderId: string, userId: string) => ["existing-rating", orderId, userId] as const,
  },

  // Disputes related
  disputes: {
    all: () => ["disputes"] as const,
    existing: (orderId: string) => ["existing-dispute", orderId] as const,
    detail: (disputeId: string) => ["dispute", disputeId] as const,
  },

  // Card catalog related
  cards: {
    all: () => ["cards"] as const,
    catalog: (filters: Record<string, unknown>) => ["card-catalog", filters] as const,
    stats: () => ["card-catalog-stats"] as const,
    duplicates: () => ["card-duplicates"] as const,
    detail: (cardId: string) => ["card", cardId] as const,
    search: (query: string) => ["card-search", query] as const,
  },

  // Sets related
  sets: {
    all: () => ["sets"] as const,
    coverage: () => ["set-coverage"] as const,
    detail: (setId: string) => ["set", setId] as const,
    japanese: () => ["japanese-sets"] as const,
  },

  // Shipping related
  shipping: {
    rates: (params: Record<string, unknown>) => ["shipping-rates", params] as const,
    labels: (orderId: string) => ["shipping-labels", orderId] as const,
    servicePoints: (postalCode: string) => ["service-points", postalCode] as const,
  },

  // Saved items related
  saved: {
    items: (userId: string) => ["saved-items", userId] as const,
    searches: (userId: string) => ["saved-searches", userId] as const,
  },

  // Notifications
  notifications: {
    all: (userId: string) => ["notifications", userId] as const,
    unread: (userId: string) => ["notifications-unread", userId] as const,
  },

  // Admin related
  admin: {
    stats: () => ["admin-stats"] as const,
    liveStats: () => ["admin-live-stats"] as const,
    users: () => ["admin-users"] as const,
    disputes: () => ["admin-disputes"] as const,
    moderation: () => ["admin-moderation"] as const,
    importJobs: () => ["import-jobs"] as const,
  },
} as const;

/**
 * Helper to invalidate all queries for a specific entity
 */
export const invalidationKeys = {
  seller: (sellerId: string) => [
    queryKeys.seller.detail(sellerId),
    queryKeys.seller.reputation(sellerId),
    queryKeys.seller.badges(sellerId),
    queryKeys.seller.stats(sellerId),
    queryKeys.seller.listings(sellerId),
  ],
  order: (orderId: string) => [
    queryKeys.orders.detail(orderId),
    queryKeys.orders.forRating(orderId),
    queryKeys.orders.forDispute(orderId),
  ],
  listing: (listingId: string) => [
    queryKeys.listings.detail(listingId),
    queryKeys.listings.variants(listingId),
    queryKeys.listings.images(listingId),
  ],
};
