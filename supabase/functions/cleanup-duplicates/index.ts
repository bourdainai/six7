import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdmin, handleCORS, createErrorResponse } from '../_shared/admin-middleware.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Card {
  id: string;
  card_id: string;
  name: string;
  set_code: string | null;
  number: string | null;
  sync_source: string | null;
  synced_at: string | null;
  images: { small?: string; large?: string } | null;
  tcgplayer_prices: Record<string, unknown> | null;
  cardmarket_prices: Record<string, unknown> | null;
}

interface CardWithListings extends Card {
  hasListings: boolean;
}

// Score a card by data completeness (higher = better to keep)
function scoreCard(card: Card): number {
  let score = 0;
  if (card.images?.small) score += 10;
  if (card.images?.large) score += 10;
  if (card.tcgplayer_prices && Object.keys(card.tcgplayer_prices).length > 0) score += 15;
  if (card.cardmarket_prices && Object.keys(card.cardmarket_prices).length > 0) score += 15;
  if (card.sync_source === 'github') score += 5;
  if (card.synced_at) {
    const age = Date.now() - new Date(card.synced_at).getTime();
    if (age < 24 * 60 * 60 * 1000) score += 5;
  }
  return score;
}

// Tables that have foreign keys to pokemon_card_attributes.card_id
const TABLES_WITH_FK = ['listings', 'trade_market_trends'];

// Fetch all card_ids that have references in any FK table
async function fetchCardIdsWithReferences(supabase: any): Promise<Set<string>> {
  const BATCH_SIZE = 1000;
  const cardIdsWithRefs = new Set<string>();

  for (const tableName of TABLES_WITH_FK) {
    let from = 0;
    let hasMore = true;

    console.log(`📥 Fetching card IDs from ${tableName}...`);

    while (hasMore) {
      const { data, error } = await supabase
        .from(tableName)
        .select('card_id')
        .not('card_id', 'is', null)
        .range(from, from + BATCH_SIZE - 1);

      if (error) {
        console.warn(`⚠️ Could not fetch from ${tableName}: ${error.message}`);
        break;
      }

      if (data && data.length > 0) {
        for (const row of data) {
          if (row.card_id) {
            cardIdsWithRefs.add(row.card_id);
          }
        }
        from += BATCH_SIZE;
        hasMore = data.length === BATCH_SIZE;
      } else {
        hasMore = false;
      }
    }
  }

  console.log(`✅ Found ${cardIdsWithRefs.size} unique card_ids with references`);
  return cardIdsWithRefs;
}

// Fetch ALL cards in batches (Supabase limits to 1000 by default)
async function fetchAllCards(supabase: any): Promise<Card[]> {
  const BATCH_SIZE = 1000;
  let allCards: Card[] = [];
  let from = 0;
  let hasMore = true;

  console.log('📥 Fetching all cards in batches...');

  while (hasMore) {
    const { data, error } = await supabase
      .from('pokemon_card_attributes')
      .select('id, card_id, name, set_code, number, sync_source, synced_at, images, tcgplayer_prices, cardmarket_prices')
      .order('id', { ascending: true })
      .range(from, from + BATCH_SIZE - 1);

    if (error) throw error;

    if (data && data.length > 0) {
      allCards = allCards.concat(data);
      from += BATCH_SIZE;
      hasMore = data.length === BATCH_SIZE;
    } else {
      hasMore = false;
    }
  }

  console.log(`✅ Total cards fetched: ${allCards.length}`);
  return allCards;
}

// Find duplicates - tries multiple grouping strategies
// Returns duplicate groups with info about which card_ids have listings
function findDuplicates(allCards: Card[], cardIdsWithListings: Set<string>): {
  duplicateGroups: number;
  cardsToDelete: Card[];
  cardsToKeep: Card[];
  skippedDueToListings: number;
  listingsToUpdate: Array<{ fromCardId: string; toCardId: string }>;
} {
  const groups = new Map<string, Card[]>();
  let skippedNoSetNumber = 0;
  
  for (const card of allCards) {
    // Primary: group by set_code + number
    if (card.set_code && card.number) {
      const key = `${card.set_code}|${card.number}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(card);
    } 
    // Fallback: group by card_id (strip prefixes like github_, tcgdex_)
    else if (card.card_id) {
      // Normalize card_id by removing common prefixes
      const normalizedId = card.card_id
        .replace(/^(github_|tcgdex_|pokemontcg_)/, '')
        .toLowerCase();
      const key = `id:${normalizedId}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(card);
      skippedNoSetNumber++;
    }
  }

  console.log(`📊 Cards without set_code/number (using card_id fallback): ${skippedNoSetNumber}`);

  const cardsToDelete: Card[] = [];
  const cardsToKeep: Card[] = [];
  const listingsToUpdate: Array<{ fromCardId: string; toCardId: string }> = [];
  let duplicateGroups = 0;
  let skippedDueToListings = 0;

  for (const [key, cards] of groups) {
    if (cards.length > 1) {
      duplicateGroups++;
      
      // Score cards - but cards with listings get a huge bonus to ensure they're kept
      const scoredCards = cards.map(card => ({ 
        card, 
        score: scoreCard(card),
        hasListings: cardIdsWithListings.has(card.card_id)
      }));
      
      // Sort: cards with listings first (they should be kept), then by score
      scoredCards.sort((a, b) => {
        // Cards with listings always come first (to be kept)
        if (a.hasListings && !b.hasListings) return -1;
        if (!a.hasListings && b.hasListings) return 1;
        // Then by score
        return b.score - a.score;
      });
      
      // The first card is kept (either has listings or highest score)
      const cardToKeep = scoredCards[0];
      cardsToKeep.push(cardToKeep.card);
      
      // Process duplicates
      for (let i = 1; i < scoredCards.length; i++) {
        const duplicate = scoredCards[i];
        
        if (duplicate.hasListings) {
          // This duplicate has listings - we need to update those listings to point to the kept card
          listingsToUpdate.push({
            fromCardId: duplicate.card.card_id,
            toCardId: cardToKeep.card.card_id
          });
          // Then we can delete it
          cardsToDelete.push(duplicate.card);
        } else {
          // No listings, safe to delete
          cardsToDelete.push(duplicate.card);
        }
      }
    }
  }

  console.log(`📊 Duplicate groups found: ${duplicateGroups}`);
  console.log(`📊 Cards to delete: ${cardsToDelete.length}`);
  console.log(`📊 Cards to keep: ${cardsToKeep.length}`);
  console.log(`📊 Listings to update (to unblock deletions): ${listingsToUpdate.length}`);
  console.log(`📊 Skipped due to listings (fallback): ${skippedDueToListings}`);

  return { duplicateGroups, cardsToDelete, cardsToKeep, skippedDueToListings, listingsToUpdate };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCORS();
  }

  // Require admin authentication for this destructive operation
  try {
    const adminUser = await requireAdmin(req);
    console.log(`🔐 Admin access granted for user: ${adminUser.email || adminUser.id}`);
  } catch (error) {
    console.error('❌ Admin authentication failed:', error);
    return createErrorResponse(error as Error);
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { dryRun = true, batchOnly = false, batchSize = 1000 } = await req.json().catch(() => ({}));

    console.log(`🧹 Cleanup duplicates (dryRun: ${dryRun}, batchOnly: ${batchOnly})`);

    // First, fetch all card_ids that have references in FK tables (these need special handling)
    const cardIdsWithListings = await fetchCardIdsWithReferences(supabase);

    // Fetch ALL cards
    const allCards = await fetchAllCards(supabase);
    
    // Find all duplicates
    const { duplicateGroups, cardsToDelete, cardsToKeep, listingsToUpdate } = findDuplicates(allCards, cardIdsWithListings);

    console.log(`📊 Found ${duplicateGroups} duplicate groups`);
    console.log(`📊 Cards to delete: ${cardsToDelete.length}`);

    // For dry run, just return the counts and samples
    if (dryRun) {
      const sampleDeleted = cardsToDelete.slice(0, 20).map(card => ({
        card_id: card.card_id,
        name: card.name,
        set_code: card.set_code,
        number: card.number,
        reason: `Lower quality duplicate (score: ${scoreCard(card)})`,
      }));

      const sampleKept = cardsToKeep.slice(0, 20).map(card => ({
        card_id: card.card_id,
        name: card.name,
        set_code: card.set_code,
        number: card.number,
      }));

      return new Response(
        JSON.stringify({
          success: true,
          dryRun: true,
          stats: { 
            duplicateGroups, 
            cardsToDelete: cardsToDelete.length, 
            actualDeleted: 0 
          },
          sampleDeleted,
          sampleKept,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ACTUAL DELETION
    if (cardsToDelete.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          dryRun: false,
          stats: {
            duplicateGroups: 0,
            cardsToDelete: 0,
            actualDeleted: 0,
            remainingDuplicates: 0,
          },
          message: 'No duplicates found to delete!',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Skip manual FK updates - we'll use the RPC function which handles this in a transaction
    const listingsUpdated = 0;

    // For large deletions, process in smaller chunks to avoid timeout
    // batchOnly mode: only delete one batch and return, let frontend call again
    const DELETE_BATCH_SIZE = batchOnly ? Math.min(batchSize, 100) : 100; // Smaller batches for RPC
    const MAX_TIME_MS = 45000; // 45 seconds max (leave 15s buffer)
    const startTime = Date.now();
    
    let totalDeleted = 0;
    const errors: string[] = [];
    const idsToDelete = cardsToDelete.map(c => c.id);

    console.log(`🔄 Deleting ${idsToDelete.length} cards in batches of ${DELETE_BATCH_SIZE}...`);
    
    // Get card_ids for RPC deletion (handles FK constraints atomically)
    const cardIdsToDelete = cardsToDelete.map(c => c.card_id);
    console.log(`   Sample IDs to delete: ${idsToDelete.slice(0, 3).join(', ')}`);
    console.log(`   Sample card_ids to delete: ${cardIdsToDelete.slice(0, 3).join(', ')}`);

    for (let i = 0; i < cardIdsToDelete.length; i += DELETE_BATCH_SIZE) {
      // Check if we're running out of time
      const elapsed = Date.now() - startTime;
      if (elapsed > MAX_TIME_MS) {
        console.log(`⏰ Approaching timeout after ${totalDeleted} deletions, stopping to avoid crash`);
        break;
      }

      const cardIdBatch = cardIdsToDelete.slice(i, i + DELETE_BATCH_SIZE);
      const idBatch = idsToDelete.slice(i, i + DELETE_BATCH_SIZE);
      const batchNum = Math.floor(i / DELETE_BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(cardIdsToDelete.length / DELETE_BATCH_SIZE);
      
      console.log(`   Batch ${batchNum}/${totalBatches}: Attempting to delete ${cardIdBatch.length} cards...`);

      try {
        // PRIMARY METHOD: Use RPC function that handles FK constraints in a transaction
        console.log(`   📤 Method 1: Using admin_delete_cards_by_card_id RPC...`);
        const { data: rpcResult, error: rpcError } = await supabase.rpc('admin_delete_cards_by_card_id', {
          card_ids_to_delete: cardIdBatch
        });
        
        if (rpcError) {
          console.error(`   ❌ RPC error:`, rpcError.message);
          console.log(`   📤 RPC not available, falling back to direct delete...`);
          
          // FALLBACK METHOD 1: Direct delete by card_id
          console.log(`   📤 Method 2: Direct delete by card_id...`);
          
          // First, clear FK references manually
          for (const tableName of TABLES_WITH_FK) {
            const { error: clearError } = await supabase
              .from(tableName)
              .update({ card_id: null })
              .in('card_id', cardIdBatch);
            if (clearError) {
              console.warn(`   ⚠️ Could not clear ${tableName} refs: ${clearError.message}`);
            }
          }
          
          // Now delete
          const { data: deletedData, error: deleteError } = await supabase
            .from('pokemon_card_attributes')
            .delete()
            .in('card_id', cardIdBatch)
            .select('id');

          if (deleteError) {
            console.error(`   ❌ Delete error:`, deleteError.message);
            errors.push(`Batch ${batchNum}: ${deleteError.message}`);
            
            // FALLBACK METHOD 2: Delete one by one
            console.log(`   📤 Method 3: Single-record deletes...`);
            let singleDeletes = 0;
            for (let j = 0; j < Math.min(cardIdBatch.length, 50); j++) {
              const cardId = cardIdBatch[j];
              
              // Clear refs for this single card
              await supabase.from('listings').update({ card_id: null }).eq('card_id', cardId);
              await supabase.from('trade_market_trends').update({ card_id: null }).eq('card_id', cardId);
              
              // Delete
              const { error: singleErr } = await supabase
                .from('pokemon_card_attributes')
                .delete()
                .eq('card_id', cardId);
                
              if (!singleErr) {
                singleDeletes++;
              } else {
                console.error(`   ❌ Single delete ${cardId} failed:`, singleErr.message);
                errors.push(`Card ${cardId}: ${singleErr.message}`);
              }
            }
            totalDeleted += singleDeletes;
            console.log(`   ✅ Method 3 deleted ${singleDeletes} cards individually`);
          } else {
            const count = deletedData?.length || 0;
            totalDeleted += count;
            console.log(`   ✅ Method 2 deleted ${count} cards`);
          }
        } else {
          // RPC succeeded
          const result = rpcResult as { deleted: number; requested: number } | null;
          const count = result?.deleted || 0;
          totalDeleted += count;
          console.log(`   ✅ Method 1 (RPC) deleted ${count}/${result?.requested || cardIdBatch.length} cards`);
          
          if (count === 0 && cardIdBatch.length > 0) {
            console.warn(`   ⚠️ RPC reported 0 deletions - cards may not exist or already deleted`);
          }
        }
      } catch (err) {
        console.error(`   ❌ Exception:`, err);
        errors.push(`Batch ${batchNum}: ${err}`);
      }

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));

      // If batchOnly mode, return after first batch
      if (batchOnly) {
        const remaining = cardIdsToDelete.length - totalDeleted;
        return new Response(
          JSON.stringify({
            success: true,
            dryRun: false,
            batchOnly: true,
            stats: {
              duplicateGroups,
              cardsToDelete: cardsToDelete.length,
              actualDeleted: totalDeleted,
              remainingDuplicates: remaining,
              batchesRemaining: Math.ceil(remaining / DELETE_BATCH_SIZE),
              listingsUpdated,
            },
            errors: errors.length > 0 ? errors : undefined,
            message: remaining > 0 
              ? `Deleted ${totalDeleted} cards. ${remaining} remaining - call again to continue.`
              : `Deleted all ${totalDeleted} duplicate cards!`,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check remaining duplicates
    const remaining = cardIdsToDelete.length - totalDeleted;

    console.log(`\n🎉 CLEANUP SESSION COMPLETE`);
    console.log(`   Listings updated: ${listingsUpdated}`);
    console.log(`   Deleted: ${totalDeleted}`);
    console.log(`   Remaining: ${remaining}`);

    return new Response(
      JSON.stringify({
        success: true,
        dryRun: false,
        stats: {
          duplicateGroups,
          cardsToDelete: cardsToDelete.length,
          actualDeleted: totalDeleted,
          remainingDuplicates: remaining,
          listingsUpdated,
        },
        errors: errors.length > 0 ? errors : undefined,
        message: remaining === 0 
          ? `Successfully removed all ${totalDeleted} duplicate cards!`
          : `Removed ${totalDeleted} cards. ${remaining} remaining - run cleanup again to continue.`,
        needsMoreRuns: remaining > 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

