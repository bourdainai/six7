/**
 * Application-wide constants
 */

// Query cache times (in milliseconds)
export const CACHE_TIMES = {
  SHORT: 1000 * 60, // 1 minute
  MEDIUM: 1000 * 60 * 5, // 5 minutes
  LONG: 1000 * 60 * 15, // 15 minutes
  VERY_LONG: 1000 * 60 * 60, // 1 hour
} as const;

// Refetch intervals (in milliseconds)
export const REFETCH_INTERVALS = {
  BALANCE: 1000 * 60 * 2, // 2 minutes
  MESSAGES: 1000 * 30, // 30 seconds
  ORDERS: 1000 * 60, // 1 minute
} as const;

// Pagination
export const PAGINATION = {
  ITEMS_PER_PAGE: 24,
  DEFAULT_LIMIT: 50,
} as const;

// Validation limits
export const VALIDATION_LIMITS = {
  MAX_TITLE_LENGTH: 200,
  MAX_DESCRIPTION_LENGTH: 5000,
  MAX_NAME_LENGTH: 100,
  MAX_ADDRESS_LENGTH: 200,
  MAX_CITY_LENGTH: 100,
  MIN_ACCOUNT_NUMBER_LENGTH: 6,
  MAX_ACCOUNT_NUMBER_LENGTH: 17,
} as const;

// Currency
export const DEFAULT_CURRENCY = "GBP" as const;

// Routes
export const ROUTES = {
  HOME: "/",
  BROWSE: "/browse",
  SELL: "/sell",
  DASHBOARD: "/dashboard/seller",
  ONBOARDING: "/seller/onboarding",
  ACCOUNT: "/seller/account",
  ANALYTICS: "/seller/analytics",
  REPUTATION: "/seller/reputation",
  AUTOMATION: "/seller/automation",
} as const;

// Error messages
export const ERROR_MESSAGES = {
  GENERIC: "Something went wrong. Please try again.",
  NETWORK: "Network error. Please check your connection.",
  UNAUTHORIZED: "You must be signed in to perform this action.",
  NOT_FOUND: "The requested resource was not found.",
  VALIDATION: "Please check your input and try again.",
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  LISTING_CREATED: "Your listing has been created successfully!",
  LISTING_UPDATED: "Your listing has been updated successfully!",
  PREFERENCES_SAVED: "Your preferences have been saved!",
  FEEDBACK_RECORDED: "Thank you for your feedback!",
} as const;
