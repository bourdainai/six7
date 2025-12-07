import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      .order('id', { ascending: true }) // Consistent ordering
      .range(from, from + BATCH_SIZE - 1);

    if (error) {
      throw error;
    }

    if (data && data.length > 0) {
      allCards = allCards.concat(data);
      from += BATCH_SIZE;
      hasMore = data.length === BATCH_SIZE;
      console.log(`   Fetched ${allCards.length} cards so far...`);
    } else {
      hasMore = false;
    }
  }

  console.log(`✅ Total cards fetched: ${allCards.length}`);
  return allCards;
}

// Find duplicates and optionally delete them
async function findDuplicates(allCards: Card[]): Promise<{
  duplicateGroups: number;
  cardsToDelete: Card[];
  cardsToKeep: Card[];
}> {
  // Group by set_code + number
  const groups = new Map<string, Card[]>();
  for (const card of allCards) {
    if (!card.set_code || !card.number) continue; // Skip invalid cards
    
    const key = `${card.set_code}|${card.number}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(card);
  }

  const cardsToDelete: Card[] = [];
  const cardsToKeep: Card[] = [];
  let duplicateGroups = 0;

  for (const [_, cards] of groups) {
    if (cards.length > 1) {
      duplicateGroups++;
      // Score and sort - keep best, delete rest
      const scoredCards = cards.map(card => ({ card, score: scoreCard(card) }));
      scoredCards.sort((a, b) => b.score - a.score);
      
      // Keep the best one
      cardsToKeep.push(scoredCards[0].card);
      
      // Delete the rest
      for (let i = 1; i < scoredCards.length; i++) {
        cardsToDelete.push(scoredCards[i].card);
      }
    }
  }

  return { duplicateGroups, cardsToDelete, cardsToKeep };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { dryRun = true } = await req.json().catch(() => ({}));

    console.log(`🧹 Cleanup duplicates (dryRun: ${dryRun})`);

    // Fetch ALL cards (not just first 1000!)
    const allCards = await fetchAllCards(supabase);
    
    // Find all duplicates
    const { duplicateGroups, cardsToDelete, cardsToKeep } = await findDuplicates(allCards);

    console.log(`📊 Found ${duplicateGroups} duplicate groups`);
    console.log(`📊 Cards to delete: ${cardsToDelete.length}`);
    console.log(`📊 Cards to keep: ${cardsToKeep.length}`);

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
    console.log(`🔄 Starting deletion of ${cardsToDelete.length} duplicate cards...`);
    
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
            iterations: 0,
          },
          message: 'No duplicates found to delete!',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete in batches to avoid timeout
    const DELETE_BATCH_SIZE = 500;
    let totalDeleted = 0;
    const errors: string[] = [];
    const idsToDelete = cardsToDelete.map(c => c.id);

    for (let i = 0; i < idsToDelete.length; i += DELETE_BATCH_SIZE) {
      const batch = idsToDelete.slice(i, i + DELETE_BATCH_SIZE);
      console.log(`   Deleting batch ${Math.floor(i / DELETE_BATCH_SIZE) + 1}: ${batch.length} cards...`);

      const { data: deletedData, error: deleteError } = await supabase
        .from('pokemon_card_attributes')
        .delete()
        .in('id', batch)
        .select('id');

      if (deleteError) {
        console.error(`   ❌ Delete error:`, deleteError.message);
        errors.push(deleteError.message);
      } else {
        const deletedCount = deletedData?.length || 0;
        totalDeleted += deletedCount;
        console.log(`   ✅ Deleted ${deletedCount} cards (total: ${totalDeleted})`);
      }

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Verify final state
    const finalCards = await fetchAllCards(supabase);
    const { cardsToDelete: remainingToDelete } = await findDuplicates(finalCards);

    console.log(`\n🎉 CLEANUP COMPLETE`);
    console.log(`   Total deleted: ${totalDeleted}`);
    console.log(`   Remaining duplicates: ${remainingToDelete.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        dryRun: false,
        stats: {
          duplicateGroups,
          cardsToDelete: cardsToDelete.length,
          actualDeleted: totalDeleted,
          remainingDuplicates: remainingToDelete.length,
          iterations: 1,
        },
        errors: errors.length > 0 ? errors : undefined,
        message: remainingToDelete.length === 0 
          ? `Successfully removed all ${totalDeleted} duplicate cards!`
          : `Removed ${totalDeleted} cards, but ${remainingToDelete.length} duplicates remain`,
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
