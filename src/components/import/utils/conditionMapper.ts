import type { Database } from "@/integrations/supabase/types";

type ConditionType = Database["public"]["Enums"]["condition_type"];

export interface GradingInfo {
  is_graded: boolean;
  grading_service?: string;
  grading_score?: string;
}

/**
 * Maps Collectr condition strings to 6Seven condition enums
 */
export function mapCollectrCondition(collectrCondition: string): ConditionType | null {
  const normalized = collectrCondition.trim().toLowerCase();
  
  const conditionMap: Record<string, ConditionType> = {
    'near mint': 'like_new',
    'nm': 'like_new',
    'mint': 'like_new',
    'lightly played': 'excellent',
    'lp': 'excellent',
    'excellent': 'excellent',
    'moderately played': 'good',
    'mp': 'good',
    'good': 'good',
    'heavily played': 'fair',
    'hp': 'fair',
    'fair': 'fair',
    'damaged': 'fair',
    'poor': 'fair'
  };

  return conditionMap[normalized] || null;
}

/**
 * Parses grading information from Collectr grade field
 * Examples: "Ungraded", "PSA 10", "CGC 9.5", "BGS 8.5"
 */
export function parseGrading(gradeString: string): GradingInfo {
  const normalized = gradeString.trim();
  
  if (!normalized || normalized.toLowerCase() === 'ungraded') {
    return { is_graded: false };
  }

  // Match pattern: "SERVICE SCORE"
  const gradingPattern = /^(PSA|CGC|BGS|Beckett)\s+([\d.]+)$/i;
  const match = normalized.match(gradingPattern);

  if (match) {
    return {
      is_graded: true,
      grading_service: match[1].toUpperCase(),
      grading_score: match[2]
    };
  }

  // If we can't parse it, default to ungraded
  return { is_graded: false };
}

/**
 * Validates and normalizes price strings
 */
export function parsePrice(priceString: string): number | null {
  if (!priceString || priceString.toLowerCase() === 'n/a') {
    return null;
  }

  // Remove currency symbols and commas
  const cleaned = priceString.replace(/[$£€,]/g, '').trim();
  const price = parseFloat(cleaned);

  return !isNaN(price) && price >= 0 ? price : null;
}

/**
 * Validates quantity
 */
export function parseQuantity(quantityString: string): number {
  const quantity = parseInt(quantityString);
  return !isNaN(quantity) && quantity > 0 ? quantity : 1;
}
