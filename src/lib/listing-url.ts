/**
 * Utility functions for generating and parsing SEO-friendly listing URLs
 * Format: /listing/product-name-seller-name-{uuid}
 * Example: /listing/sacred-charm-phantasmal-flames-gavin-mckew-2a03c197
 */

/**
 * Convert a string to URL-safe slug
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars except hyphens
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}

/**
 * Generate SEO-friendly listing URL
 */
export function generateListingUrl(
  listingId: string,
  title: string,
  sellerName?: string | null
): string {
  const titleSlug = slugify(title);
  const sellerSlug = sellerName ? slugify(sellerName) : '';
  
  // Get short UUID (first 8 chars) for uniqueness
  const shortId = listingId.split('-')[0];
  
  // Build URL: /listing/title-seller-shortid
  const parts = [titleSlug];
  if (sellerSlug) {
    parts.push(sellerSlug);
  }
  parts.push(shortId);
  
  return `/listing/${parts.join('-')}`;
}

/**
 * Extract listing ID from URL (supports both old UUID format and new slug format)
 */
export function extractListingId(urlPath: string): string | null {
  // Remove /listing/ prefix if present
  const path = urlPath.replace(/^\/listing\//, '');
  
  // Check if it's a full UUID (old format)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(path)) {
    return path;
  }
  
  // Extract short ID from end of slug and try to find full UUID
  // New format: product-name-seller-name-shortid
  const parts = path.split('-');
  const shortId = parts[parts.length - 1];
  
  // Short ID should be 8 hex characters
  if (shortId && /^[0-9a-f]{8}$/i.test(shortId)) {
    return shortId; // Return short ID, we'll query by it
  }
  
  return null;
}

/**
 * Check if a path is in the old UUID format
 */
export function isOldFormatUrl(path: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(path.replace(/^\/listing\//, ''));
}
