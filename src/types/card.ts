/**
 * Unified Card Data Types
 *
 * These types are used across the sell wizard, card search,
 * and listing components to ensure consistency.
 */

/**
 * Core card data structure used throughout the app
 */
export interface CardData {
  id: string;
  name: string;
  setName: string;
  setCode: string;
  cardNumber: string;
  rarity: string;
  imageUrl: string;
  marketPrice?: number;
}

/**
 * Extended card data from the database (pokemon_card_attributes)
 */
export interface CardAttributes {
  id: string;
  name: string;
  name_en: string | null;
  set_id: string;
  set_name: string | null;
  set_name_en: string | null;
  number: string | null;
  printed_number: string | null;
  rarity: string | null;
  image_url_small: string | null;
  image_url_large: string | null;
  price_tcgplayer_normal: number | null;
  price_tcgplayer_holofoil: number | null;
  price_cardmarket_avg: number | null;
  types: string[] | null;
  subtypes: string[] | null;
  supertype: string | null;
  hp: number | null;
  artist: string | null;
  flavor_text: string | null;
  rules: string[] | null;
  attacks: unknown[] | null;
  abilities: unknown[] | null;
  weaknesses: unknown[] | null;
  resistances: unknown[] | null;
  retreat_cost: string[] | null;
  regulation_mark: string | null;
  legalities: Record<string, string> | null;
  created_at: string;
  updated_at: string;
}

/**
 * Card search result type
 */
export interface CardSearchResult {
  id: string;
  name: string;
  name_en: string | null;
  set_name: string | null;
  set_name_en: string | null;
  printed_number: string | null;
  rarity: string | null;
  image_url_large: string | null;
  image_url_small: string | null;
  price_tcgplayer_holofoil: number | null;
  price_tcgplayer_normal: number | null;
  price_cardmarket_avg: number | null;
}

/**
 * Convert CardSearchResult to CardData
 */
export function toCardData(card: CardSearchResult): CardData {
  return {
    id: card.id,
    name: card.name_en || card.name || "",
    setName: card.set_name_en || card.set_name || "",
    setCode: "", // Not always available in search results
    cardNumber: card.printed_number || "",
    rarity: card.rarity || "",
    imageUrl: card.image_url_large || card.image_url_small || "",
    marketPrice:
      card.price_tcgplayer_holofoil ||
      card.price_tcgplayer_normal ||
      card.price_cardmarket_avg ||
      undefined,
  };
}

/**
 * Convert CardAttributes to CardData
 */
export function attributesToCardData(card: CardAttributes): CardData {
  return {
    id: card.id,
    name: card.name_en || card.name || "",
    setName: card.set_name_en || card.set_name || "",
    setCode: card.set_id || "",
    cardNumber: card.printed_number || card.number || "",
    rarity: card.rarity || "",
    imageUrl: card.image_url_large || card.image_url_small || "",
    marketPrice:
      card.price_tcgplayer_holofoil ||
      card.price_tcgplayer_normal ||
      card.price_cardmarket_avg ||
      undefined,
  };
}

/**
 * Card condition type
 */
export type CardCondition =
  | "mint"
  | "near_mint"
  | "excellent"
  | "good"
  | "played"
  | "damaged";

/**
 * Grading service type
 */
export type GradingService = "PSA" | "BGS" | "CGC" | "ACE" | "Other";

/**
 * Card listing draft used in sell wizard
 */
export interface CardListingDraft {
  card: CardData | null;
  images: string[];
  imageFiles: File[];
  condition: CardCondition | "";
  isGraded: boolean;
  gradingService: string;
  gradingScore: string;
  price: number | "";
  acceptsOffers: boolean;
  description: string;
  freeShipping: boolean;
  shippingCost: number;
  aiEnabled: boolean;
}

/**
 * Default draft state
 */
export const defaultListingDraft: CardListingDraft = {
  card: null,
  images: [],
  imageFiles: [],
  condition: "",
  isGraded: false,
  gradingService: "",
  gradingScore: "",
  price: "",
  acceptsOffers: true,
  description: "",
  freeShipping: false,
  shippingCost: 1.99,
  aiEnabled: true,
};
