import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Image source fallback chain
const IMAGE_SOURCES = [
  {
    name: 'pokemontcg',
    getUrl: (setCode: string, number: string) => 
      `https://images.pokemontcg.io/${setCode}/${number}.png`,
    getHiResUrl: (setCode: string, number: string) => 
      `https://images.pokemontcg.io/${setCode}/${number}_hires.png`
  },
  {
    name: 'tcgdex_en',
    getUrl: (setCode: string, number: string) => 
      `https://assets.tcgdex.net/en/sv/${setCode}/${number.padStart(3, '0')}/low.webp`,
    getHiResUrl: (setCode: string, number: string) => 
      `https://assets.tcgdex.net/en/sv/${setCode}/${number.padStart(3, '0')}/high.webp`
  },
  {
    name: 'tcgdex_ja',
    getUrl: (setCode: string, number: string) => 
      `https://assets.tcgdex.net/ja/sv/${setCode.toUpperCase()}/${number.padStart(3, '0')}/low.webp`,
    getHiResUrl: (setCode: string, number: string) => 
      `https://assets.tcgdex.net/ja/sv/${setCode.toUpperCase()}/${number.padStart(3, '0')}/high.webp`
  }
];

async function checkImageExists(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

async function findValidImageUrl(setCode: string, number: string): Promise<{ small: string; large: string; source: string } | null> {
  for (const source of IMAGE_SOURCES) {
    const smallUrl = source.getUrl(setCode, number);
    const largeUrl = source.getHiResUrl(setCode, number);
    
    // Check if at least the small image exists
    if (await checkImageExists(smallUrl)) {
      // If hi-res doesn't exist, use small for both
      const largeExists = await checkImageExists(largeUrl);
      return {
        small: smallUrl,
        large: largeExists ? largeUrl : smallUrl,
        source: source.name
      };
    }
  }
  
  return null;
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

    const { 
      setCode = null,
      limit = 100,
      validateExisting = false 
    } = await req.json().catch(() => ({}));

    console.log('🔍 Starting image validation and repair...');

    // Find cards with missing or null images
    let query = supabase
      .from('pokemon_card_attributes')
      .select('id, card_id, name, set_code, number, images')
      .limit(limit);

    if (setCode) {
      query = query.eq('set_code', setCode);
    }

    if (!validateExisting) {
      // Only cards with null/missing images
      query = query.or('images.is.null,images->small.is.null');
    }

    const { data: cardsToFix, error: fetchError } = await query;

    if (fetchError) {
      throw fetchError;
    }

    console.log(`📊 Found ${cardsToFix?.length || 0} cards to process`);

    if (!cardsToFix || cardsToFix.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No cards need image fixes',
          stats: { processed: 0, fixed: 0, failed: 0 }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let fixed = 0;
    let failed = 0;
    let validated = 0;
    const failures: Array<{ card_id: string; name: string; reason: string }> = [];

    for (const card of cardsToFix) {
      try {
        // If validating existing images, check if current URL works
        if (validateExisting && card.images?.small) {
          const currentWorks = await checkImageExists(card.images.small);
          if (currentWorks) {
            validated++;
            continue;
          }
          console.log(`⚠️  Current image broken for ${card.name}: ${card.images.small}`);
        }

        // Try to find a valid image URL
        const validImage = await findValidImageUrl(card.set_code, card.number);

        if (validImage) {
          const { error: updateError } = await supabase
            .from('pokemon_card_attributes')
            .update({
              images: {
                small: validImage.small,
                large: validImage.large,
                source: validImage.source
              },
              synced_at: new Date().toISOString()
            })
            .eq('id', card.id);

          if (updateError) {
            console.error(`❌ Update failed for ${card.name}:`, updateError);
            failed++;
            failures.push({ card_id: card.card_id, name: card.name, reason: updateError.message });
          } else {
            console.log(`✅ Fixed ${card.name} using ${validImage.source}`);
            fixed++;
          }
        } else {
          console.log(`❌ No valid image found for ${card.name} (${card.set_code}/${card.number})`);
          failed++;
          failures.push({ card_id: card.card_id, name: card.name, reason: 'No valid image found in any source' });
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (cardError) {
        console.error(`❌ Error processing ${card.name}:`, cardError);
        failed++;
        failures.push({ 
          card_id: card.card_id, 
          name: card.name, 
          reason: cardError instanceof Error ? cardError.message : 'Unknown error' 
        });
      }
    }

    console.log(`\n🎉 Image validation complete!`);
    console.log(`📊 Stats: ${fixed} fixed, ${failed} failed, ${validated} already valid`);

    return new Response(
      JSON.stringify({
        success: true,
        stats: {
          processed: cardsToFix.length,
          fixed,
          failed,
          validated
        },
        failures: failures.slice(0, 20) // Return first 20 failures for debugging
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Validation error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

