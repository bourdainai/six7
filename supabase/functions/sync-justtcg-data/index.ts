import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireCronAuth, handleCORS, createUnauthorizedResponse, getCorsHeaders } from "../_shared/cron-auth.ts";

const corsHeaders = getCorsHeaders();

const JUSTTCG_API_URL = "https://api.justtcg.com/v1";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCORS();
  }

  // Require cron authentication
  const authResult = await requireCronAuth(req);
  if (!authResult.authorized) {
    console.warn(`Unauthorized access attempt to sync-justtcg-data: ${authResult.reason}`);
    return createUnauthorizedResponse(authResult.reason);
  }

  console.log(`Authenticated via: ${authResult.authType}`);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const justTcgApiKey = Deno.env.get('JUSTTCG_API_KEY') ?? '';

    if (!justTcgApiKey) {
      throw new Error('JUSTTCG_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const { 
      setId,
      mode = 'prices',
      limit = 2000
    } = body;

    console.log(`Starting JustTCG sync - Mode: ${mode}, Set: ${setId || 'auto'}, Limit: ${limit}`);

    let targetSetId = setId;
    const updateOnly = mode === 'prices';

    if (!targetSetId) {
      if (updateOnly) {
        const { data: lastUpdate } = await supabase
          .from('pokemon_card_attributes')
          .select('last_price_update')
          .eq('sync_source', 'justtcg')
          .order('last_price_update', { ascending: false })
          .limit(1)
          .single();

        const lastUpdateTimestamp = lastUpdate?.last_price_update 
          ? Math.floor(new Date(lastUpdate.last_price_update).getTime() / 1000)
          : Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);

        console.log(`Price update mode - fetching cards updated since ${new Date(lastUpdateTimestamp * 1000).toISOString()}`);
      } else {
        const { data: sets } = await supabase
          .from('tcg_sync_progress')
          .select('set_code')
          .eq('sync_status', 'completed')
          .eq('sync_source', 'justtcg');

        const completedSets = new Set(sets?.map(s => s.set_code) || []);

        const setsResponse = await fetch(`${JUSTTCG_API_URL}/sets?game=pokemon`, {
          headers: {
            'x-api-key': justTcgApiKey,
            'Content-Type': 'application/json',
          },
        });

        if (!setsResponse.ok) {
          throw new Error(`JustTCG API Error: ${setsResponse.statusText}`);
        }

        const setsData = await setsResponse.json();
        const availableSets = setsData.data || [];

        const nextSet = availableSets.find((s: any) => !completedSets.has(s.id));
        
        if (nextSet) {
          targetSetId = nextSet.id;
          console.log(`Auto-selected set: ${nextSet.name} (${targetSetId})`);
        } else {
          return new Response(
            JSON.stringify({ message: 'All sets already synced', mode: 'complete' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    let apiUrl = `${JUSTTCG_API_URL}/cards?game=pokemon`;
    
    if (updateOnly) {
      const lastUpdateTimestamp = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
      apiUrl += `&updatedAt=${lastUpdateTimestamp}`;
    } else if (targetSetId) {
      apiUrl += `&set=${targetSetId}`;
    }

    apiUrl += `&limit=${limit}`;

    console.log(`Fetching from: ${apiUrl}`);

    const cardsResponse = await fetch(apiUrl, {
      headers: {
        'x-api-key': justTcgApiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!cardsResponse.ok) {
      throw new Error(`JustTCG API Error: ${cardsResponse.statusText}`);
    }

    const cardsData = await cardsResponse.json();
    const cards = cardsData.data || [];

    if (cards.length === 0) {
      console.log('No cards returned from API');
      
      if (targetSetId && !updateOnly) {
        await supabase
          .from('tcg_sync_progress')
          .upsert({
            set_code: targetSetId,
            set_name: targetSetId,
            sync_source: 'justtcg',
            sync_status: 'completed',
            synced_cards: 0,
            total_cards: 0,
            last_sync_at: new Date().toISOString(),
          }, { onConflict: 'set_code,sync_source' });
      }

      return new Response(
        JSON.stringify({ message: 'No cards found to sync', cards: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetched ${cards.length} cards from JustTCG`);

    const now = new Date().toISOString();
    const cardIds = cards.map((card: any) => card.tcgplayerId);

    const { data: existingCards } = await supabase
      .from('pokemon_card_attributes')
      .select('tcgplayer_id')
      .in('tcgplayer_id', cardIds);

    const existingCardIds = new Set(existingCards?.map(c => c.tcgplayer_id) || []);

    let insertCount = 0;
    let updateCount = 0;

    for (const card of cards) {
      const exists = existingCardIds.has(card.tcgplayerId);

      let avgPrice = null;
      if (card.variants && card.variants.length > 0) {
        const prices = card.variants
          .filter((v: any) => v.price && v.price > 0 && v.condition === 'Near Mint')
          .map((v: any) => v.price);
        
        if (prices.length > 0) {
          avgPrice = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
        }
      }

      const pricingData = {
        variants: card.variants || [],
        averagePrice: avgPrice,
        lastUpdated: now,
      };

      if (updateOnly && exists) {
        const { error: updateError } = await supabase
          .from('pokemon_card_attributes')
          .update({
            tcgplayer_prices: pricingData,
            last_price_update: now,
            updated_at: now,
          })
          .eq('tcgplayer_id', card.tcgplayerId);

        if (!updateError) {
          updateCount++;
        } else {
          console.error(`Update error for ${card.tcgplayerId}:`, updateError);
        }
      } else if (!updateOnly && !exists) {
        const { error: insertError } = await supabase
          .from('pokemon_card_attributes')
          .insert({
            card_id: card.id,
            name: card.name,
            set_name: card.set_name,
            set_code: card.set,
            number: card.number || null,
            rarity: card.rarity || null,
            tcgplayer_id: card.tcgplayerId,
            tcgplayer_prices: pricingData,
            images: {
              small: `https://images.justtcg.com/${card.game}/${card.set}/${card.number || card.id}.jpg`,
              large: `https://images.justtcg.com/${card.game}/${card.set}/${card.number || card.id}.jpg`,
            },
            last_price_update: now,
            synced_at: now,
            sync_source: 'justtcg',
            updated_at: now,
          });

        if (!insertError) {
          insertCount++;
        } else {
          console.error(`Insert error for ${card.tcgplayerId}:`, insertError);
        }
      }
    }

    console.log(`✅ Processed ${cards.length} cards: ${insertCount} new, ${updateCount} updated`);

    if (targetSetId && !updateOnly) {
      await supabase
        .from('tcg_sync_progress')
        .upsert({
          set_code: targetSetId,
          set_name: cards[0]?.set_name || targetSetId,
          sync_source: 'justtcg',
          sync_status: 'completed',
          synced_cards: insertCount,
          total_cards: cards.length,
          last_sync_at: now,
        }, { onConflict: 'set_code,sync_source' });
    }

    return new Response(
      JSON.stringify({
        message: `Successfully synced ${cards.length} cards from JustTCG`,
        mode: updateOnly ? 'price_update' : 'full_sync',
        setId: targetSetId,
        newCards: insertCount,
        priceUpdates: updateCount,
        totalProcessed: cards.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
