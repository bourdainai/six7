import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔍 Fetching sv4a cards missing images...');

    // Get all sv4a cards that are missing images
    const { data: cardsNeedingImages, error: fetchError } = await supabase
      .from('pokemon_card_attributes')
      .select('id, card_id, number, name')
      .eq('set_code', 'sv4a')
      .or('images.is.null,images.eq.{}');

    if (fetchError) throw fetchError;

    console.log(`📋 Found ${cardsNeedingImages?.length || 0} sv4a cards needing images`);

    if (!cardsNeedingImages || cardsNeedingImages.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'All sv4a cards already have images',
        updated: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Try to get images from Japanese TCGdex since English isn't available
    console.log('🇯🇵 Fetching from Japanese TCGdex API...');
    const japaneseSetUrl = 'https://api.tcgdex.net/v2/ja/sets/SV4a';
    const setResponse = await fetch(japaneseSetUrl);
    
    if (!setResponse.ok) {
      console.log('⚠️ Japanese set not found, trying alternative approaches...');
      
      // Mark cards as requiring user upload
      let marked = 0;
      for (const card of cardsNeedingImages) {
        await supabase
          .from('pokemon_card_attributes')
          .update({ 
            metadata: {
              image_ok: false,
              requires_user_upload: true,
              image_checked_at: new Date().toISOString(),
              note: 'Stock images not available for Shiny Treasure ex set'
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', card.id);
        marked++;
      }

      return new Response(JSON.stringify({
        success: true,
        source: 'none',
        message: 'Shiny Treasure ex not available in TCGdex',
        markedForUserUpload: marked
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const setData = await setResponse.json();
    console.log(`✅ Found Japanese set: ${setData.name} with ${setData.cards?.length || 0} cards`);

    // Create a map of card numbers to image URLs from Japanese set
    const imageMap = new Map<string, { small: string; large: string }>();
    for (const card of setData.cards || []) {
      if (card.image) {
        // TCGdex Japanese images - convert localId to match our format
        const cardNumber = card.localId?.toString();
        if (cardNumber) {
          imageMap.set(cardNumber, {
            small: `https://assets.tcgdex.net/ja/SV/SV4a/${cardNumber}/low.webp`,
            large: `https://assets.tcgdex.net/ja/SV/SV4a/${cardNumber}/high.webp`
          });
          // Also add padded version
          const paddedNumber = cardNumber.padStart(3, '0');
          imageMap.set(paddedNumber, {
            small: `https://assets.tcgdex.net/ja/SV/SV4a/${cardNumber}/low.webp`,
            large: `https://assets.tcgdex.net/ja/SV/SV4a/${cardNumber}/high.webp`
          });
        }
      }
    }

    console.log(`📦 Built image map with ${imageMap.size} entries`);

    let updated = 0;
    let failed = 0;

    // Update our database with the image URLs
    for (const card of cardsNeedingImages) {
      try {
        // Try to find image by card number (handle both padded and unpadded)
        const cardNumber = card.number?.toString().replace(/^0+/, ''); // Remove leading zeros
        let images = imageMap.get(cardNumber);
        
        if (!images) {
          // Try with original number format
          images = imageMap.get(card.number);
        }

        if (images) {
          const { error } = await supabase
            .from('pokemon_card_attributes')
            .update({
              images: images,
              image_validated: true,
              image_validated_at: new Date().toISOString(),
              metadata: {
                image_ok: true,
                image_source: 'tcgdex_ja',
                image_updated_at: new Date().toISOString()
              },
              updated_at: new Date().toISOString()
            })
            .eq('id', card.id);

          if (error) throw error;
          updated++;
          console.log(`✅ Updated ${card.name} (${card.number})`);
        } else {
          console.log(`⚠️ No image found for ${card.name} (${card.number})`);
          failed++;
        }
      } catch (err) {
        console.error(`❌ Failed to update ${card.name}:`, err);
        failed++;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      source: 'tcgdex_ja',
      message: 'Updated sv4a cards with Japanese TCGdex images',
      updated,
      failed,
      total: cardsNeedingImages.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Import error:', error);
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
