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
  set_code: string;
  number: string;
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

async function findAndDeleteDuplicates(supabase: any): Promise<{ found: number; deleted: number; errors: string[] }> {
  const errors: string[] = [];
  
  // Fetch all cards
  const { data: allCards, error: fetchError } = await supabase
    .from('pokemon_card_attributes')
    .select('id, card_id, name, set_code, number, sync_source, synced_at, images, tcgplayer_prices, cardmarket_prices');

  if (fetchError) {
    throw fetchError;
  }

  // Group by set_code + number
  const groups = new Map<string, Card[]>();
  for (const card of (allCards || []) as Card[]) {
    const key = `${card.set_code}|${card.number}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(card);
  }

  // Find IDs to delete
  const idsToDelete: string[] = [];
  
  for (const [_, cards] of groups) {
    if (cards.length > 1) {
      // Score and sort - keep best, delete rest
      const scoredCards = cards.map(card => ({ card, score: scoreCard(card) }));
      scoredCards.sort((a, b) => b.score - a.score);
      
      // Skip first (best), delete others
      for (let i = 1; i < scoredCards.length; i++) {
        idsToDelete.push(scoredCards[i].card.id);
      }
    }
  }

  if (idsToDelete.length === 0) {
    return { found: 0, deleted: 0, errors };
  }

  console.log(`   Found ${idsToDelete.length} duplicates to delete`);

  // Delete ALL at once using a single query
  const { data: deletedData, error: deleteError } = await supabase
    .from('pokemon_card_attributes')
    .delete()
    .in('id', idsToDelete)
    .select('id');

  if (deleteError) {
    console.error(`   ❌ Delete error:`, deleteError.message);
    errors.push(deleteError.message);
    return { found: idsToDelete.length, deleted: 0, errors };
  }

  const deletedCount = deletedData?.length || 0;
  console.log(`   ✅ Deleted ${deletedCount} cards`);

  return { found: idsToDelete.length, deleted: deletedCount, errors };
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

    // For dry run, just count duplicates
    if (dryRun) {
      const { data: allCards } = await supabase
        .from('pokemon_card_attributes')
        .select('id, card_id, name, set_code, number, sync_source, images, tcgplayer_prices, cardmarket_prices');

      const groups = new Map<string, Card[]>();
      for (const card of (allCards || []) as Card[]) {
        const key = `${card.set_code}|${card.number}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(card);
      }

      let duplicateGroups = 0;
      let cardsToDelete = 0;
      const sampleDeleted: any[] = [];
      const sampleKept: any[] = [];

      for (const [_, cards] of groups) {
        if (cards.length > 1) {
          duplicateGroups++;
          const scoredCards = cards.map(card => ({ card, score: scoreCard(card) }));
          scoredCards.sort((a, b) => b.score - a.score);
          
          sampleKept.push({
            card_id: scoredCards[0].card.card_id,
            name: scoredCards[0].card.name,
            set_code: scoredCards[0].card.set_code,
            number: scoredCards[0].card.number,
          });

          for (let i = 1; i < scoredCards.length; i++) {
            cardsToDelete++;
            if (sampleDeleted.length < 20) {
              sampleDeleted.push({
                card_id: scoredCards[i].card.card_id,
                name: scoredCards[i].card.name,
                set_code: scoredCards[i].card.set_code,
                number: scoredCards[i].card.number,
                reason: `Duplicate of ${scoredCards[0].card.card_id} (score: ${scoredCards[0].score} vs ${scoredCards[i].score})`,
              });
            }
          }
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          dryRun: true,
          stats: { duplicateGroups, cardsToDelete, actualDeleted: 0 },
          sampleDeleted,
          sampleKept: sampleKept.slice(0, 20),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ACTUAL DELETION - Loop until all duplicates are gone
    console.log(`🔄 Starting deletion loop - will continue until 0 duplicates remain`);
    
    let totalDeleted = 0;
    let iterations = 0;
    const maxIterations = 20; // Safety limit
    const allErrors: string[] = [];

    while (iterations < maxIterations) {
      iterations++;
      console.log(`\n📍 Iteration ${iterations}:`);
      
      const result = await findAndDeleteDuplicates(supabase);
      
      if (result.errors.length > 0) {
        allErrors.push(...result.errors);
      }
      
      totalDeleted += result.deleted;
      
      if (result.found === 0) {
        console.log(`✅ No more duplicates found! Total deleted: ${totalDeleted}`);
        break;
      }
      
      if (result.deleted === 0 && result.found > 0) {
        console.log(`⚠️ Found ${result.found} duplicates but couldn't delete them`);
        allErrors.push(`Could not delete ${result.found} duplicates`);
        break;
      }
      
      // Small delay between iterations
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    if (iterations >= maxIterations) {
      console.log(`⚠️ Reached max iterations (${maxIterations})`);
    }

    // Final count check
    const { data: finalCards } = await supabase
      .from('pokemon_card_attributes')
      .select('set_code, number');
    
    const finalGroups = new Map<string, number>();
    for (const card of finalCards || []) {
      const key = `${card.set_code}|${card.number}`;
      finalGroups.set(key, (finalGroups.get(key) || 0) + 1);
    }
    
    let remainingDuplicates = 0;
    for (const count of finalGroups.values()) {
      if (count > 1) remainingDuplicates += count - 1;
    }

    console.log(`\n🎉 CLEANUP COMPLETE`);
    console.log(`   Total deleted: ${totalDeleted}`);
    console.log(`   Iterations: ${iterations}`);
    console.log(`   Remaining duplicates: ${remainingDuplicates}`);

    return new Response(
      JSON.stringify({
        success: true,
        dryRun: false,
        stats: {
          duplicateGroups: 0,
          cardsToDelete: 0,
          actualDeleted: totalDeleted,
          remainingDuplicates,
          iterations,
        },
        errors: allErrors.length > 0 ? allErrors : undefined,
        message: remainingDuplicates === 0 
          ? `Successfully removed all ${totalDeleted} duplicate cards!`
          : `Removed ${totalDeleted} cards, but ${remainingDuplicates} duplicates remain`,
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
