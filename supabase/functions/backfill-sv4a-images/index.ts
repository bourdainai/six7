import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Fetch with timeout
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 4000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function checkImageExists(url: string): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(url, { method: 'HEAD' }, 3000);
    return response.ok;
  } catch {
    return false;
  }
}

// Get all possible image URLs for sv4a cards
function getSv4aImageUrls(number: string): Array<{ url: string; source: string; small?: string }> {
  const paddedNumber = number.padStart(3, '0');
  const rawNumber = number.replace(/^0+/, '') || number;
  
  return [
    // Pokemon TCG CDN - primary source
    { 
      url: `https://images.pokemontcg.io/sv4a/${rawNumber}.png`, 
      source: 'pokemontcg',
      small: `https://images.pokemontcg.io/sv4a/${rawNumber}.png`
    },
    { 
      url: `https://images.pokemontcg.io/sv4a/${paddedNumber}.png`, 
      source: 'pokemontcg',
      small: `https://images.pokemontcg.io/sv4a/${paddedNumber}.png`
    },
    // High-res variants
    { 
      url: `https://images.pokemontcg.io/sv4a/${rawNumber}_hires.png`, 
      source: 'pokemontcg_hires',
      small: `https://images.pokemontcg.io/sv4a/${rawNumber}.png`
    },
    
    // TCGdex Japanese (sv4a is Japanese Shiny Treasure ex)
    { 
      url: `https://assets.tcgdex.net/ja/sv/sv4a/${paddedNumber}/high.webp`, 
      source: 'tcgdex_ja',
      small: `https://assets.tcgdex.net/ja/sv/sv4a/${paddedNumber}/low.webp`
    },
    { 
      url: `https://assets.tcgdex.net/ja/sv/SV4a/${paddedNumber}/high.webp`, 
      source: 'tcgdex_ja',
      small: `https://assets.tcgdex.net/ja/sv/SV4a/${paddedNumber}/low.webp`
    },
    
    // TCGdex English (might have English versions)
    { 
      url: `https://assets.tcgdex.net/en/sv/sv4a/${paddedNumber}/high.webp`, 
      source: 'tcgdex_en',
      small: `https://assets.tcgdex.net/en/sv/sv4a/${paddedNumber}/low.webp`
    },
    
    // Limitless TCG
    { 
      url: `https://limitlesstcg.nyc3.digitaloceanspaces.com/tpci/SV4a/SV4a_${paddedNumber}_R_EN.png`, 
      source: 'limitless'
    },
    { 
      url: `https://limitlesstcg.nyc3.digitaloceanspaces.com/tpci/SV4a/SV4a_${paddedNumber}_R_JA.png`, 
      source: 'limitless_ja'
    },
    
    // PkmnCards
    { 
      url: `https://pkmncards.com/wp-content/uploads/en_US-SV4a-${paddedNumber}-shiny.png`, 
      source: 'pkmncards'
    },
  ];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startTime = Date.now();
  const MAX_RUNTIME_MS = 25000; // 25 seconds to avoid timeout

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🔧 Starting sv4a image backfill with multi-source lookup...')

    // Fetch all sv4a cards without images
    const { data: cardsToUpdate, error: fetchError } = await supabase
      .from('pokemon_card_attributes')
      .select('id, card_id, number, name, set_code')
      .eq('set_code', 'sv4a')
      .or('images.is.null,images->small.is.null')
      .limit(100)

    if (fetchError) {
      console.error('❌ Error fetching cards:', fetchError)
      throw fetchError
    }

    console.log(`📊 Found ${cardsToUpdate?.length || 0} cards to update`)

    if (!cardsToUpdate || cardsToUpdate.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No cards need updating',
          updated: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let successCount = 0
    let errorCount = 0
    let skipped = 0
    const errors: any[] = []
    const successes: any[] = []

    // Update each card with constructed image URLs
    for (const card of cardsToUpdate) {
      // Check time limit
      if (Date.now() - startTime > MAX_RUNTIME_MS) {
        console.log(`⏱️  Time limit reached after processing ${successCount + errorCount} cards`);
        skipped = cardsToUpdate.length - (successCount + errorCount);
        break;
      }

      try {
        const urlsToTry = getSv4aImageUrls(card.number || '0');
        let foundImage: { small: string; large: string; source: string } | null = null;
        
        // Try each URL in batches of 3 for speed
        for (let i = 0; i < urlsToTry.length && !foundImage; i += 3) {
          const batch = urlsToTry.slice(i, i + 3);
          const results = await Promise.all(
            batch.map(async ({ url, source, small }) => {
              const exists = await checkImageExists(url);
              return exists ? { url, source, small } : null;
            })
          );
          
          const found = results.find(r => r !== null);
          if (found) {
            foundImage = {
              small: found.small || found.url,
              large: found.url,
              source: found.source
            };
          }
        }
        
        // If still not found, try Pokemon TCG API
        if (!foundImage) {
          try {
            const apiKey = Deno.env.get('POKEMON_TCG_API_KEY') || '';
            const rawNumber = card.number?.replace(/^0+/, '') || card.number;
            
            console.log(`🔍 API lookup for ${card.name} (${rawNumber})...`);
            const apiResponse = await fetchWithTimeout(
              `https://api.pokemontcg.io/v2/cards?q=set.id:sv4a%20number:${rawNumber}&pageSize=1`,
              { headers: apiKey ? { 'X-Api-Key': apiKey } : {} },
              5000
            );
            
            if (apiResponse.ok) {
              const apiData = await apiResponse.json();
              if (apiData.data?.[0]?.images) {
                const img = apiData.data[0].images;
                foundImage = {
                  small: img.small || img.large,
                  large: img.large || img.small,
                  source: 'pokemontcg_api'
                };
                console.log(`✅ Found via API: ${foundImage.large}`);
              }
            }
          } catch (apiErr) {
            console.warn(`API lookup failed for ${card.name}: ${apiErr}`);
          }
        }
        
        if (!foundImage) {
          console.log(`❌ No image found for ${card.name} (${card.number})`);
          errorCount++;
          errors.push({ card_id: card.card_id, name: card.name, error: 'Not found in any source' });
          continue;
        }
        
        console.log(`🖼️  Updating ${card.name} (${card.number}) from ${foundImage.source}`);

        const { error: updateError } = await supabase
          .from('pokemon_card_attributes')
          .update({ 
            images: {
              small: foundImage.small,
              large: foundImage.large,
              source: foundImage.source
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', card.id)

        if (updateError) {
          console.error(`❌ Failed to update ${card.card_id}:`, updateError)
          errorCount++
          errors.push({ card_id: card.card_id, name: card.name, error: updateError.message })
        } else {
          successCount++
          successes.push({ card_id: card.card_id, name: card.name, source: foundImage.source })
        }
      } catch (err) {
        console.error(`❌ Error processing ${card.card_id}:`, err)
        errorCount++
        errors.push({ card_id: card.card_id, name: card.name, error: String(err) })
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ Backfill complete in ${elapsed}s: ${successCount} updated, ${errorCount} errors, ${skipped} skipped`);

    return new Response(
      JSON.stringify({
        success: true,
        elapsed_seconds: parseFloat(elapsed),
        stats: {
          total: cardsToUpdate.length,
          updated: successCount,
          errors: errorCount,
          skipped
        },
        successes: successes.slice(0, 10),
        errorDetails: errors.slice(0, 10)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('❌ Backfill error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
