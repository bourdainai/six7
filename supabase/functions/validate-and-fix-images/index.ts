import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fetch with timeout
async function fetchWithTimeout(url: string, timeoutMs = 5000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { 
      method: 'HEAD', 
      signal: controller.signal 
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function checkImageExists(url: string): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(url, 3000);
    return response.ok;
  } catch {
    return false;
  }
}

// Image source fallback chain - ordered by reliability
function getImageUrls(setCode: string, number: string): Array<{ url: string; source: string }> {
  const paddedNumber = number.padStart(3, '0');
  const rawNumber = number.replace(/^0+/, '') || number;
  
  return [
    // Pokemon TCG CDN (most reliable for English sets)
    { url: `https://images.pokemontcg.io/${setCode}/${rawNumber}.png`, source: 'pokemontcg' },
    { url: `https://images.pokemontcg.io/${setCode}/${paddedNumber}.png`, source: 'pokemontcg' },
    { url: `https://images.pokemontcg.io/${setCode.toLowerCase()}/${rawNumber}.png`, source: 'pokemontcg' },
    
    // TCGdex English
    { url: `https://assets.tcgdex.net/en/sv/${setCode}/${paddedNumber}/high.webp`, source: 'tcgdex_en' },
    { url: `https://assets.tcgdex.net/en/sv/${setCode.toLowerCase()}/${paddedNumber}/high.webp`, source: 'tcgdex_en' },
    
    // TCGdex Japanese (for Japanese sets)
    { url: `https://assets.tcgdex.net/ja/sv/${setCode}/${paddedNumber}/high.webp`, source: 'tcgdex_ja' },
    { url: `https://assets.tcgdex.net/ja/sv/${setCode.toUpperCase()}/${paddedNumber}/high.webp`, source: 'tcgdex_ja' },
    
    // Older set formats
    { url: `https://images.pokemontcg.io/${setCode}/${rawNumber}_hires.png`, source: 'pokemontcg_hires' },
  ];
}

async function findValidImageUrl(
  setCode: string, 
  number: string,
  cardName?: string
): Promise<{ small: string; large: string; source: string } | null> {
  const urls = getImageUrls(setCode, number);
  
  // Try each URL in parallel batches for speed
  for (let i = 0; i < urls.length; i += 3) {
    const batch = urls.slice(i, i + 3);
    const results = await Promise.all(
      batch.map(async ({ url, source }) => {
        const exists = await checkImageExists(url);
        return exists ? { url, source } : null;
      })
    );
    
    const found = results.find(r => r !== null);
    if (found) {
      // Determine small/large URLs based on source
      if (found.source.startsWith('tcgdex')) {
        const baseUrl = found.url.replace('/high.webp', '');
        return {
          small: `${baseUrl}/low.webp`,
          large: found.url,
          source: found.source
        };
      }
      return {
        small: found.url,
        large: found.url.replace('.png', '_hires.png').replace('_hires_hires', '_hires'),
        source: found.source
      };
    }
  }
  
  // Last resort: Try Pokemon TCG API
  try {
    const apiKey = Deno.env.get('POKEMON_TCG_API_KEY') || '';
    const searchQuery = cardName 
      ? `set.id:${setCode} number:${number}`
      : `set.id:${setCode} number:${number}`;
    
    const apiResponse = await fetchWithTimeout(
      `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(searchQuery)}&pageSize=1`,
      5000
    );
    
    // Need to actually get the body for API calls
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const fullResponse = await fetch(
        `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(searchQuery)}&pageSize=1`,
        { 
          headers: apiKey ? { 'X-Api-Key': apiKey } : {},
          signal: controller.signal 
        }
      );
      
      if (fullResponse.ok) {
        const data = await fullResponse.json();
        if (data.data?.[0]?.images) {
          const img = data.data[0].images;
          return {
            small: img.small || img.large,
            large: img.large || img.small,
            source: 'pokemontcg_api'
          };
        }
      }
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    // API lookup failed, return null
  }
  
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const MAX_RUNTIME_MS = 25000; // 25 seconds max to avoid timeout

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      setCode = null,
      limit = 50,  // Reduced default limit
      validateExisting = false 
    } = await req.json().catch(() => ({}));

    console.log('🔍 Starting image validation and repair...');
    console.log(`   Set filter: ${setCode || 'all'}, Limit: ${limit}`);

    // Find cards with missing or null images
    let query = supabase
      .from('pokemon_card_attributes')
      .select('id, card_id, name, set_code, number, images')
      .limit(limit);

    if (setCode) {
      query = query.eq('set_code', setCode);
    }

    if (!validateExisting) {
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
          stats: { processed: 0, fixed: 0, failed: 0, skipped: 0 }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let fixed = 0;
    let failed = 0;
    let validated = 0;
    let skipped = 0;
    const failures: Array<{ card_id: string; name: string; reason: string }> = [];

    for (const card of cardsToFix) {
      // Check if we're running out of time
      if (Date.now() - startTime > MAX_RUNTIME_MS) {
        console.log(`⏱️  Time limit reached, processed ${fixed + failed + validated} cards`);
        skipped = cardsToFix.length - (fixed + failed + validated);
        break;
      }

      try {
        // If validating existing images, check if current URL works
        if (validateExisting && card.images?.small) {
          const currentWorks = await checkImageExists(card.images.small);
          if (currentWorks) {
            validated++;
            continue;
          }
          console.log(`⚠️  Current image broken for ${card.name}`);
        }

        // Try to find a valid image URL
        const validImage = await findValidImageUrl(card.set_code, card.number, card.name);

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
            console.error(`❌ Update failed for ${card.name}:`, updateError.message);
            failed++;
            failures.push({ card_id: card.card_id, name: card.name, reason: updateError.message });
          } else {
            console.log(`✅ Fixed ${card.name} using ${validImage.source}`);
            fixed++;
          }
        } else {
          console.log(`❌ No image for ${card.name} (${card.set_code}/${card.number})`);
          failed++;
          failures.push({ card_id: card.card_id, name: card.name, reason: 'No valid image found' });
        }

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

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n🎉 Image validation complete in ${elapsed}s!`);
    console.log(`📊 Stats: ${fixed} fixed, ${failed} failed, ${validated} valid, ${skipped} skipped`);

    return new Response(
      JSON.stringify({
        success: true,
        elapsed_seconds: parseFloat(elapsed),
        stats: {
          processed: cardsToFix.length,
          fixed,
          failed,
          validated,
          skipped
        },
        failures: failures.slice(0, 20)
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
