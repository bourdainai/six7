import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🔧 Starting sv4a image backfill...')

    // Fetch all sv4a cards without images
    const { data: cardsToUpdate, error: fetchError } = await supabase
      .from('pokemon_card_attributes')
      .select('id, card_id, number, name, set_code')
      .eq('set_code', 'sv4a')
      .eq('sync_source', 'on_demand')
      .is('images', null)

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
    const errors: any[] = []

    // Update each card with constructed image URLs
    for (const card of cardsToUpdate) {
      try {
        // Pad the card number to 3 digits (001, 002, etc.)
        const paddedNumber = card.number?.padStart(3, '0') || '000'
        const rawNumber = card.number || '0'
        
        // Multiple URL formats to try for sv4a (Japanese Shiny Treasure ex)
        // sv4a is a Japanese exclusive set - try multiple sources
        const urlsToTry = [
          // Pokemon TCG API images (most reliable for Japanese sets)
          { url: `https://images.pokemontcg.io/sv4a/${rawNumber}.png`, type: 'pokemontcg' },
          { url: `https://images.pokemontcg.io/sv4a/${rawNumber}_hires.png`, type: 'pokemontcg_hires' },
          // TCGdex formats (various capitalization)
          { url: `https://assets.tcgdex.net/ja/sv/SV4a/${paddedNumber}/high.webp`, type: 'tcgdex' },
          { url: `https://assets.tcgdex.net/ja/sv/sv4a/${paddedNumber}/high.webp`, type: 'tcgdex' },
          { url: `https://assets.tcgdex.net/en/sv/sv4a/${paddedNumber}/high.webp`, type: 'tcgdex' },
          // Limitless TCG
          { url: `https://limitlesstcg.nyc3.digitaloceanspaces.com/tpci/SV4a/SV4a_${paddedNumber}_R_EN.png`, type: 'limitless' },
        ]
        
        let foundImage: { small: string; large: string; source: string } | null = null
        
        // Try each URL
        for (const { url, type } of urlsToTry) {
          try {
            const response = await fetch(url, { method: 'HEAD' })
            if (response.ok) {
              console.log(`✅ Found image for ${card.name} at ${type}: ${url}`)
              if (type === 'tcgdex') {
                const baseUrl = url.replace('/high.webp', '')
                foundImage = {
                  small: `${baseUrl}/low.webp`,
                  large: url,
                  source: 'tcgdex'
                }
              } else {
                foundImage = {
                  small: url,
                  large: url,
                  source: type
                }
              }
              break
            }
          } catch {
            // Continue to next URL
          }
        }
        
        // If still not found, try Pokemon TCG API query
        if (!foundImage) {
          try {
            console.log(`🔍 Trying API lookup for ${card.name}...`)
            const apiResponse = await fetch(
              `https://api.pokemontcg.io/v2/cards?q=set.id:sv4a%20number:${rawNumber}`,
              { headers: { 'X-Api-Key': Deno.env.get('POKEMON_TCG_API_KEY') || '' } }
            )
            if (apiResponse.ok) {
              const apiData = await apiResponse.json()
              if (apiData.data?.[0]?.images) {
                const img = apiData.data[0].images
                foundImage = {
                  small: img.small || img.large,
                  large: img.large || img.small,
                  source: 'pokemontcg_api'
                }
                console.log(`✅ Found via API: ${foundImage.large}`)
              }
            }
          } catch (apiErr) {
            console.warn(`API lookup failed: ${apiErr}`)
          }
        }
        
        if (!foundImage) {
          console.error(`❌ No image found for ${card.name} (${paddedNumber}) after trying all sources`)
          errorCount++
          errors.push({ card: card.card_id, error: 'Image not found in any source' })
          continue
        }
        
        const imageData = {
          small: foundImage.small,
          large: foundImage.large,
          source: foundImage.source
        }

        console.log(`🖼️  Updating ${card.name} (${card.number}) with image: ${imageUrl}`)

        const { error: updateError } = await supabase
          .from('pokemon_card_attributes')
          .update({ 
            images: imageData,
            updated_at: new Date().toISOString()
          })
          .eq('id', card.id)

        if (updateError) {
          console.error(`❌ Failed to update ${card.card_id}:`, updateError)
          errorCount++
          errors.push({ card: card.card_id, error: updateError.message })
        } else {
          successCount++
        }
      } catch (err) {
        console.error(`❌ Error processing ${card.card_id}:`, err)
        errorCount++
        errors.push({ card: card.card_id, error: String(err) })
      }
    }

    console.log(`✅ Backfill complete: ${successCount} updated, ${errorCount} errors`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Updated ${successCount} cards`,
        updated: successCount,
        errors: errorCount,
        errorDetails: errors.length > 0 ? errors.slice(0, 10) : undefined
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
