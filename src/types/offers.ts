/**
 * Offer related type definitions
 */

export interface OfferMetadata {
  variant_id?: string;
  variant_name?: string;
  [key: string]: unknown;
}

export interface OfferData {
  conversation_id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'countered';
  metadata?: OfferMetadata;
  created_at?: string;
  updated_at?: string;
}

export interface CounterOfferData extends Omit<OfferData, 'status'> {
  counter_offer_to: string;
  status: 'pending';
}
