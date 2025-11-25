/**
 * Formats database values for user-facing display
 * Replaces underscores with spaces and capitalizes words
 */

export const formatCondition = (condition: string | null | undefined): string => {
  if (!condition) return "";
  return condition.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
};

export const formatStatus = (status: string | null | undefined): string => {
  if (!status) return "";
  return status.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
};

export const formatText = (text: string | null | undefined): string => {
  if (!text) return "";
  return text.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
};

/**
 * Formats any database enum or snake_case value for display
 */
export const formatForDisplay = (value: string | null | undefined): string => {
  if (!value) return "";
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
};

/**
 * Formats currency values
 */
export const formatCurrency = (amount: number, currency: string = 'GBP'): string => {
  const locale = currency === 'USD' ? 'en-US' : 'en-GB';
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  });
  return formatter.format(amount);
};

/**
 * Formats currency for marketplace display
 */
export const formatMarketplaceCurrency = (amount: number, marketplace: 'UK' | 'US'): string => {
  const currency = marketplace === 'US' ? 'USD' : 'GBP';
  return formatCurrency(amount, currency);
};

