import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DuplicateGroup {
  set_code: string;
  number: string;
  count: number;
  cards: Array<{
    id: string;
    card_id: string;
    name: string;
    sync_source: string;
    synced_at: string;
    has_images: boolean;
    has_prices: boolean;
  }>;
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

    console.log('🔍 Detecting duplicate cards...');

    // Find all cards grouped by set_code and number
    const { data: allCards, error: fetchError } = await supabase
      .from('pokemon_card_attributes')
      .select('id, card_id, name, set_code, number, sync_source, synced_at, images, tcgplayer_prices, cardmarket_prices')
      .order('set_code')
      .order('number');

    if (fetchError) {
      throw fetchError;
    }

    // Group by set_code + number
    const groups = new Map<string, typeof allCards>();
    
    for (const card of allCards || []) {
      const key = `${card.set_code}|${card.number}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(card);
    }

    // Find duplicates (groups with more than 1 card)
    const duplicateGroups: DuplicateGroup[] = [];
    let totalDuplicateCards = 0;

    for (const [key, cards] of groups) {
      if (cards.length > 1) {
        const [set_code, number] = key.split('|');
        totalDuplicateCards += cards.length - 1; // Count extra cards (not the original)
        
        duplicateGroups.push({
          set_code,
          number,
          count: cards.length,
          cards: cards.map(card => ({
            id: card.id,
            card_id: card.card_id,
            name: card.name,
            sync_source: card.sync_source || 'unknown',
            synced_at: card.synced_at || '',
            has_images: !!(card.images?.small || card.images?.large),
            has_prices: !!(card.tcgplayer_prices || card.cardmarket_prices),
          })),
        });
      }
    }

    // Sort by count (most duplicates first)
    duplicateGroups.sort((a, b) => b.count - a.count);

    // Get summary stats
    const setStats = new Map<string, number>();
    for (const group of duplicateGroups) {
      const current = setStats.get(group.set_code) || 0;
      setStats.set(group.set_code, current + (group.count - 1));
    }

    const affectedSets = Array.from(setStats.entries())
      .map(([set_code, duplicates]) => ({ set_code, duplicates }))
      .sort((a, b) => b.duplicates - a.duplicates);

    console.log(`📊 Found ${duplicateGroups.length} groups with duplicates`);
    console.log(`📊 Total duplicate cards to remove: ${totalDuplicateCards}`);

    return new Response(
      JSON.stringify({
        success: true,
        stats: {
          totalGroups: duplicateGroups.length,
          totalDuplicates: totalDuplicateCards,
          affectedSets: affectedSets.slice(0, 20), // Top 20 affected sets
        },
        // Return sample of first 50 duplicate groups for review
        sampleGroups: duplicateGroups.slice(0, 50),
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

