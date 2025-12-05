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
  
  // Has images (+10 for each)
  if (card.images?.small) score += 10;
  if (card.images?.large) score += 10;
  
  // Has prices (+15 for each source)
  if (card.tcgplayer_prices && Object.keys(card.tcgplayer_prices).length > 0) score += 15;
  if (card.cardmarket_prices && Object.keys(card.cardmarket_prices).length > 0) score += 15;
  
  // Prefer github source (+5)
  if (card.sync_source === 'github') score += 5;
  
  // More recently synced (+5)
  if (card.synced_at) {
    const age = Date.now() - new Date(card.synced_at).getTime();
    if (age < 24 * 60 * 60 * 1000) score += 5; // Synced in last 24h
  }
  
  return score;
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

    console.log(`🧹 Cleaning up ALL duplicates (dryRun: ${dryRun})...`);

    // Fetch all cards
    const { data: allCards, error: fetchError } = await supabase
      .from('pokemon_card_attributes')
      .select('id, card_id, name, set_code, number, sync_source, synced_at, images, tcgplayer_prices, cardmarket_prices')
      .order('set_code')
      .order('number');

    if (fetchError) {
      console.error('❌ Fetch error:', fetchError);
      throw fetchError;
    }

    console.log(`📊 Fetched ${allCards?.length || 0} total cards`);

    // Group by set_code + number
    const groups = new Map<string, Card[]>();
    
    for (const card of (allCards || []) as Card[]) {
      const key = `${card.set_code}|${card.number}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(card);
    }

    // Find duplicates and determine which to delete
    const idsToDelete: string[] = [];
    const keptCards: Array<{ card_id: string; name: string; set_code: string; number: string }> = [];
    const deletedCards: Array<{ card_id: string; name: string; set_code: string; number: string; reason: string }> = [];
    let duplicateGroups = 0;

    for (const [key, cards] of groups) {
      if (cards.length > 1) {
        duplicateGroups++;
        
        // Score each card
        const scoredCards = cards.map(card => ({
          card,
          score: scoreCard(card),
        }));
        
        // Sort by score descending (best first)
        scoredCards.sort((a, b) => b.score - a.score);
        
        // Keep the best one, mark others for deletion
        const [keeper, ...toDelete] = scoredCards;
        
        keptCards.push({
          card_id: keeper.card.card_id,
          name: keeper.card.name,
          set_code: keeper.card.set_code,
          number: keeper.card.number,
        });
        
        for (const { card } of toDelete) {
          idsToDelete.push(card.id);
          deletedCards.push({
            card_id: card.card_id,
            name: card.name,
            set_code: card.set_code,
            number: card.number,
            reason: `Duplicate of ${keeper.card.card_id} (score: ${keeper.score} vs ${scoreCard(card)})`,
          });
        }
      }
    }

    console.log(`📊 Found ${duplicateGroups} duplicate groups`);
    console.log(`📊 Cards to delete: ${idsToDelete.length}`);

    let actualDeleted = 0;
    const deleteErrors: string[] = [];

    if (!dryRun && idsToDelete.length > 0) {
      console.log(`🗑️ Starting deletion of ${idsToDelete.length} cards...`);
      
      // Delete in smaller batches of 50 for reliability
      for (let i = 0; i < idsToDelete.length; i += 50) {
        const batch = idsToDelete.slice(i, i + 50);
        
        console.log(`   Deleting batch ${Math.floor(i/50) + 1}: ${batch.length} cards (IDs: ${batch.slice(0, 3).join(', ')}...)`);
        
        // Use delete with select to get actual deleted records
        const { data: deletedData, error: deleteError } = await supabase
          .from('pokemon_card_attributes')
          .delete()
          .in('id', batch)
          .select('id');

        if (deleteError) {
          console.error(`❌ Delete error in batch:`, deleteError.message);
          deleteErrors.push(deleteError.message);
        } else {
          const deletedCount = deletedData?.length || 0;
          actualDeleted += deletedCount;
          console.log(`   ✅ Batch deleted: ${deletedCount} cards (total: ${actualDeleted})`);
        }

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log(`🎉 Deletion complete: ${actualDeleted} cards removed`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        dryRun,
        stats: {
          duplicateGroups,
          cardsToDelete: idsToDelete.length,
          actualDeleted: dryRun ? 0 : actualDeleted,
        },
        errors: deleteErrors.length > 0 ? deleteErrors : undefined,
        // Sample of what was/would be deleted (first 20)
        sampleDeleted: deletedCards.slice(0, 20),
        // Sample of what was/would be kept (first 20)
        sampleKept: keptCards.slice(0, 20),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
