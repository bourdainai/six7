import { mapCollectrCondition, parseGrading, parsePrice, parseQuantity } from "./conditionMapper";
import type { Database } from "@/integrations/supabase/types";

type ListingInsert = Database["public"]["Tables"]["listings"]["Insert"];

export interface CollectrCsvRow {
  portfolioName: string;       // A
  category: string;             // B
  set: string;                  // C
  productName: string;          // D
  cardNumber: string;           // E
  rarity: string;               // F
  variance: string;             // G
  grade: string;                // H
  cardCondition: string;        // I
  averageCostPer: string;       // J
  quantity: string;             // K
  marketPrice: string;          // L
  watchlist: string;            // M (new - TRUE/FALSE)
  dateAdded: string;            // N
  note: string;                 // O
}

export interface MappedListing {
  listing: Partial<ListingInsert>;
  errors: string[];
  quantity: number;
}

/**
 * Maps a single CSV row from Collectr to 6Seven listing format
 */
export function mapCsvRowToListing(row: CollectrCsvRow, userId: string): MappedListing {
  const errors: string[] = [];
  const quantity = parseQuantity(row.quantity);

  // Parse price
  const price = parsePrice(row.marketPrice);
  if (!price) {
    errors.push("Invalid or missing market price");
  }

  // Parse condition
  const condition = mapCollectrCondition(row.cardCondition);
  if (!condition) {
    errors.push(`Unknown condition: ${row.cardCondition}`);
  }

  // Parse grading
  const grading = parseGrading(row.grade);

  // Build title
  const title = row.productName || `${row.set} - ${row.cardNumber}`;

  // Build description
  const descriptionParts = [];
  if (row.variance) descriptionParts.push(`Variance: ${row.variance}`);
  if (row.note) descriptionParts.push(row.note);
  const description = descriptionParts.join('\n') || null;

  // Create listing object
  const listing: Partial<ListingInsert> = {
    seller_id: userId,
    title,
    description,
    category: "Trading Cards",
    set_code: row.set || null,
    card_number: row.cardNumber || null,
    seller_price: price || 0,
    condition,
    currency: "GBP",
    status: "draft",
    portfolio_name: row.portfolioName || "Imported Collection",
    import_metadata: {
      rarity: row.rarity,
      variance: row.variance,
      grade: row.grade,
      average_cost: row.averageCostPer,
      watchlist: row.watchlist === "TRUE",
      date_added: row.dateAdded,
      note: row.note,
      ...grading
    }
  };

  // Validate required fields
  if (!listing.title) errors.push("Missing product name");
  if (!listing.set_code) errors.push("Missing set");
  if (!price) errors.push("Missing market price");

  return { listing, errors, quantity };
}

/**
 * Expected CSV column headers from Collectr (in order)
 */
export const EXPECTED_CSV_HEADERS = [
  "Portfolio Name",
  "Category",
  "Set",
  "Product Name",
  "Card Number",
  "Rarity",
  "Variance",
  "Grade",
  "Card Condition",
  "Average Cost Paid",
  "Quantity",
  "Market Price",
  "Watchlist",
  "Date Added",
  "Notes"
];

/**
 * Validates CSV headers match expected format
 */
export function validateCsvHeaders(headers: string[]): { valid: boolean; message?: string } {
  if (headers.length < 15) {
    return {
      valid: false,
      message: `Expected 15 columns, found ${headers.length}. Please use the exact Collectr export format.`
    };
  }

  // Check for key columns (flexible on exact match for minor variations)
  const hasProductName = headers.some(h => h.toLowerCase().includes('product') || h.toLowerCase().includes('name'));
  const hasSet = headers.some(h => h.toLowerCase().includes('set'));
  const hasPrice = headers.some(h => h.toLowerCase().includes('price') || h.toLowerCase().includes('market'));

  if (!hasProductName || !hasSet || !hasPrice) {
    return {
      valid: false,
      message: "Missing required columns. Please ensure CSV has Product Name, Set, and Market Price columns."
    };
  }

  return { valid: true };
}
