// Utility functions for conversations
import { supabase } from './supabaseClient';

/**
 * Create or find a conversation for a listing
 * Returns the conversation ID
 */
export async function getOrCreateConversation(listingId, buyerId, sellerId) {
  try {
    // First check if conversation already exists
    const { data: existing, error: findError } = await supabase
      .from('conversations')
      .select('id')
      .eq('listing_id', listingId)
      .eq('buyer_id', buyerId)
      .single();

    if (existing && !findError) {
      return existing.id;
    }

    // Create new conversation
    const { data: conversation, error: createError } = await supabase
      .from('conversations')
      .insert({
        listing_id: listingId,
        buyer_id: buyerId,
        seller_id: sellerId,
      })
      .select('id')
      .single();

    if (createError) throw createError;

    return conversation.id;
  } catch (error) {
    console.error('Error creating/finding conversation:', error);
    throw error;
  }
}

/**
 * Create an offer for a listing
 */
export async function createOffer(conversationId, listingId, buyerId, sellerId, amount, message = null) {
  try {
    const { data: offer, error } = await supabase
      .from('offers')
      .insert({
        conversation_id: conversationId,
        listing_id: listingId,
        buyer_id: buyerId,
        seller_id: sellerId,
        amount: amount,
        message: message,
        status: 'pending',
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 hours
      })
      .select('id')
      .single();

    if (error) throw error;

    return offer.id;
  } catch (error) {
    console.error('Error creating offer:', error);
    throw error;
  }
}

