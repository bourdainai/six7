import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Allow CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting import of missing SV4a cards from TCGdex...');
    
    // Fetch ALL cards from SV4a set from TCGdex
    const setResponse = await fetch('https://api.tcgdex.net/v2/ja/sets/SV4a');
    const setData = await setResponse.json();
    
    console.log(`TCGdex reports ${setData.cardCount?.total || setData.cards.length} cards in SV4a`);
    
    if (!setData.cards || setData.cards.length === 0) {
      throw new Error('No cards found in SV4a set');
    }

    // Check which card IDs we already have
    const { data: existingCards } = await supabase
      .from('pokemon_card_attributes')
      .select('card_id')
      .eq('set_code', 'SV4a');

    const existingCardIds = new Set(existingCards?.map(c => c.card_id) || []);
    console.log(`Already have ${existingCardIds.size} cards in database`);

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    // Process each card
    for (const card of setData.cards) {
      const cardId = `tcgdex_ja_${card.id}`;
      
      if (existingCardIds.has(cardId)) {
        skipped++;
        continue;
      }

      try {
        // Fetch full card details
        const cardResponse = await fetch(`https://api.tcgdex.net/v2/ja/cards/${card.id}`);
        const cardData = await cardResponse.json();

        // Determine series path for image URL
        const seriesPath = 'sv';
        const imageUrl = cardData.image || 
          `https://assets.tcgdex.net/ja/${seriesPath}/SV4a/${cardData.localId}`;

        // Prepare alt_numbers if card has variants
        const altNumbers: string[] = [];
        if (cardData.variants) {
          Object.keys(cardData.variants).forEach(variant => {
            if (variant !== cardData.localId && variant !== cardData.id) {
              altNumbers.push(variant);
              // Add with set total too
              altNumbers.push(`${variant}/190`);
            }
          });
        }

        // Insert card
        const { error: insertError } = await supabase
          .from('pokemon_card_attributes')
          .insert({
            card_id: cardId,
            name: cardData.name,
            set_name: setData.name,
            set_code: 'SV4a',
            number: cardData.localId,
            rarity: cardData.rarity || null,
            types: cardData.types || null,
            supertype: cardData.category || null,
            subtypes: cardData.stage ? [cardData.stage] : null,
            artist: cardData.illustrator || null,
            images: {
              small: imageUrl,
              large: imageUrl,
              tcgdex: imageUrl
            },
            tcgplayer_prices: cardData.pricing?.tcgplayer ? {
              updated: cardData.pricing.tcgplayer.updated,
              holofoil: cardData.pricing.tcgplayer.holofoil,
              normal: cardData.pricing.tcgplayer.normal,
              reverseHolofoil: cardData.pricing.tcgplayer.reverseHolofoil
            } : null,
            cardmarket_prices: cardData.pricing?.cardmarket ? {
              updated: cardData.pricing.cardmarket.updated,
              avg: cardData.pricing.cardmarket.avg,
              low: cardData.pricing.cardmarket.low,
              high: cardData.pricing.cardmarket.high,
              trend: cardData.pricing.cardmarket.trend
            } : null,
            printed_total: setData.cardCount?.official || 190,
            sync_source: 'tcgdex',
            synced_at: new Date().toISOString(),
            last_price_update: cardData.pricing ? new Date().toISOString() : null,
            metadata: {
              hp: cardData.hp,
              evolveFrom: cardData.evolveFrom,
              abilities: cardData.abilities,
              attacks: cardData.attacks,
              weaknesses: cardData.weaknesses,
              resistances: cardData.resistances,
              retreat: cardData.retreat,
              dexId: cardData.dexId,
              variants: cardData.variants,
              alt_numbers: altNumbers.length > 0 ? altNumbers : null,
              language: 'ja',
              category: cardData.category,
              localId: cardData.localId
            }
          });

        if (insertError) {
          console.error(`Error inserting card ${card.id}:`, insertError);
          errors++;
        } else {
          imported++;
          if (imported % 10 === 0) {
            console.log(`Imported ${imported} cards so far...`);
          }
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));

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
          totalCards: setData.cards.length
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
