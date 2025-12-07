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
function findDuplicates(allCards: Card[]): {
  duplicateGroups: number;
  cardsToDelete: Card[];
  cardsToKeep: Card[];
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
  let duplicateGroups = 0;

  for (const [key, cards] of groups) {
    if (cards.length > 1) {
      duplicateGroups++;
      const scoredCards = cards.map(card => ({ card, score: scoreCard(card) }));
      scoredCards.sort((a, b) => b.score - a.score);
      
      cardsToKeep.push(scoredCards[0].card);
      
      for (let i = 1; i < scoredCards.length; i++) {
        cardsToDelete.push(scoredCards[i].card);
      }
    }
  }

  console.log(`📊 Duplicate groups found: ${duplicateGroups}`);
  console.log(`📊 Cards to delete: ${cardsToDelete.length}`);
  console.log(`📊 Cards to keep: ${cardsToKeep.length}`);

  return { duplicateGroups, cardsToDelete, cardsToKeep };
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

    // Fetch ALL cards
    const allCards = await fetchAllCards(supabase);
    
    // Find all duplicates
    const { duplicateGroups, cardsToDelete, cardsToKeep } = findDuplicates(allCards);

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

    // For large deletions, process in smaller chunks to avoid timeout
    // batchOnly mode: only delete one batch and return, let frontend call again
    const DELETE_BATCH_SIZE = batchOnly ? Math.min(batchSize, 500) : 200;
    const MAX_TIME_MS = 45000; // 45 seconds max (leave 15s buffer)
    const startTime = Date.now();
    
    let totalDeleted = 0;
    const errors: string[] = [];
    const idsToDelete = cardsToDelete.map(c => c.id);

    console.log(`🔄 Deleting ${idsToDelete.length} cards in batches of ${DELETE_BATCH_SIZE}...`);

    for (let i = 0; i < idsToDelete.length; i += DELETE_BATCH_SIZE) {
      // Check if we're running out of time
      const elapsed = Date.now() - startTime;
      if (elapsed > MAX_TIME_MS) {
        console.log(`⏰ Approaching timeout after ${totalDeleted} deletions, stopping to avoid crash`);
        break;
      }

      const batch = idsToDelete.slice(i, i + DELETE_BATCH_SIZE);
      const batchNum = Math.floor(i / DELETE_BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(idsToDelete.length / DELETE_BATCH_SIZE);
      
      console.log(`   Batch ${batchNum}/${totalBatches}: Deleting ${batch.length} cards...`);

      try {
        console.log(`   📤 Attempting to delete IDs: ${batch.slice(0, 3).join(', ')}...`);
        
        // First verify these IDs exist
        const { data: existCheck, error: checkError } = await supabase
          .from('pokemon_card_attributes')
          .select('id')
          .in('id', batch.slice(0, 5));
        
        if (checkError) {
          console.error(`   ⚠️ Check error:`, checkError.message);
        } else {
          console.log(`   📋 Found ${existCheck?.length || 0} of first 5 IDs in database`);
        }

        const { data: deletedData, error: deleteError } = await supabase
          .from('pokemon_card_attributes')
          .delete()
          .in('id', batch)
          .select('id');

        if (deleteError) {
          console.error(`   ❌ Delete error:`, deleteError.message);
          console.error(`   ❌ Error code:`, deleteError.code);
          console.error(`   ❌ Error details:`, deleteError.details);
          errors.push(`Batch ${batchNum}: ${deleteError.message} (code: ${deleteError.code})`);
        } else {
          const deletedCount = deletedData?.length || 0;
          totalDeleted += deletedCount;
          console.log(`   ✅ Deleted ${deletedCount} cards (total: ${totalDeleted})`);
          
          if (deletedCount === 0 && batch.length > 0) {
            console.warn(`   ⚠️ 0 cards deleted but ${batch.length} were requested - possible RLS issue`);
            // Try deleting one by one to identify the issue
            if (batch.length > 0) {
              const testId = batch[0];
              const { error: singleDeleteError } = await supabase
                .from('pokemon_card_attributes')
                .delete()
                .eq('id', testId);
              if (singleDeleteError) {
                console.error(`   ⚠️ Single delete test failed:`, singleDeleteError.message);
              }
            }
          }
        }
      } catch (err) {
        console.error(`   ❌ Exception:`, err);
        errors.push(`Batch ${batchNum}: ${err}`);
      }

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 50));

      // If batchOnly mode, return after first batch
      if (batchOnly) {
        const remaining = idsToDelete.length - totalDeleted;
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
    const remaining = idsToDelete.length - totalDeleted;

    console.log(`\n🎉 CLEANUP SESSION COMPLETE`);
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
