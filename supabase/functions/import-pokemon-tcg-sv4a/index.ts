import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const pokemonTcgApiKey = Deno.env.get('POKEMON_TCG_API_KEY');
    if (!pokemonTcgApiKey) {
      throw new Error('POKEMON_TCG_API_KEY not configured');
    }

    console.log('Fetching SV4a cards from Pokemon TCG API...');
    
    // Search for all SV4a cards (Shiny Treasure ex)
    const response = await fetch(
      'https://api.pokemontcg.io/v2/cards?q=set.id:sv4a&pageSize=250',
      {
        headers: {
          'X-Api-Key': pokemonTcgApiKey
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Pokemon TCG API error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`Found ${data.data.length} cards in SV4a set`);

    // Check which cards we already have with complete data
    const { data: existingCards } = await supabase
      .from('pokemon_card_attributes')
      .select('card_id, name, images')
      .eq('set_code', 'SV4a');

    const completeCardIds = new Set(
      existingCards
        ?.filter(c => c.images && c.name && !c.name.startsWith('Card #'))
        .map(c => c.card_id) || []
    );

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const card of data.data) {
      const cardId = `pokemon_${card.id}`;
      
      // Skip if we already have complete data
      if (completeCardIds.has(cardId)) {
        skipped++;
        continue;
      }

      // Delete any incomplete data
      await supabase
        .from('pokemon_card_attributes')
        .delete()
        .eq('card_id', cardId);

      try {
        // Prepare card data
        const cardNumber = card.number;
        const printedTotal = card.set.printedTotal || 190;
        const displayNumber = `${cardNumber}/${printedTotal}`;

        // Get prices
        const tcgplayerPrices = card.tcgplayer?.prices ? {
          updated: card.tcgplayer.updatedAt,
          holofoil: card.tcgplayer.prices.holofoil,
          normal: card.tcgplayer.prices.normal,
          reverseHolofoil: card.tcgplayer.prices.reverseHolofoil,
          '1stEditionHolofoil': card.tcgplayer.prices['1stEditionHolofoil']
        } : null;

        const cardmarketPrices = card.cardmarket?.prices ? {
          updated: card.cardmarket.updatedAt,
          avg: card.cardmarket.prices.averageSellPrice,
          low: card.cardmarket.prices.lowPrice,
          high: card.cardmarket.prices.trendPrice,
          trend: card.cardmarket.prices.germanProLow
        } : null;

        // Insert card
        const { error: insertError } = await supabase
          .from('pokemon_card_attributes')
          .insert({
            card_id: cardId,
            name: card.name,
            set_name: card.set.name,
            set_code: 'SV4a',
            number: cardNumber,
            display_number: displayNumber,
            search_number: displayNumber,
            rarity: card.rarity || null,
            types: card.types || null,
            supertype: card.supertype || null,
            subtypes: card.subtypes || null,
            artist: card.artist || null,
            images: {
              small: card.images.small,
              large: card.images.large,
              pokemon_tcg: card.images.large
            },
            tcgplayer_id: card.tcgplayer?.url || null,
            tcgplayer_prices: tcgplayerPrices,
            cardmarket_id: card.cardmarket?.url || null,
            cardmarket_prices: cardmarketPrices,
            printed_total: printedTotal,
            sync_source: 'pokemon_tcg_api',
            synced_at: new Date().toISOString(),
            last_price_update: (tcgplayerPrices || cardmarketPrices) ? new Date().toISOString() : null,
            metadata: {
              hp: card.hp,
              level: card.level,
              evolvesFrom: card.evolvesFrom,
              evolvesTo: card.evolvesTo,
              abilities: card.abilities,
              attacks: card.attacks,
              weaknesses: card.weaknesses,
              resistances: card.resistances,
              retreatCost: card.retreatCost,
              convertedRetreatCost: card.convertedRetreatCost,
              rules: card.rules,
              regulationMark: card.regulationMark,
              nationalPokedexNumbers: card.nationalPokedexNumbers,
              legalities: card.legalities
            }
          });

        if (insertError) {
          console.error(`Error inserting card ${card.id}:`, insertError);
          errors++;
        } else {
          imported++;
          if (imported % 10 === 0) {
            console.log(`Imported ${imported} cards...`);
          }
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (err) {
        console.error(`Error processing card ${card.id}:`, err);
        errors++;
      }
    }

    console.log(`✅ Import complete: ${imported} imported, ${skipped} skipped, ${errors} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        stats: {
          imported,
          skipped,
          errors,
          totalCards: data.data.length
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
    
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
