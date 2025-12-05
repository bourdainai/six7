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
        
        // Construct TCGdex CDN URLs - Note: TCGdex uses SV4a (capital S, lowercase a)
        // Format: https://assets.tcgdex.net/{lang}/{series}/{setId}/{cardNumber}/high.webp
        const imageUrl = `https://assets.tcgdex.net/ja/sv/SV4a/${paddedNumber}`
        
        // Validate image exists before updating
        const imageCheck = await fetch(`${imageUrl}/high.webp`, { method: 'HEAD' })
        if (!imageCheck.ok) {
          console.warn(`⚠️  Image not found for ${card.name} (${paddedNumber}), trying alternative format...`)
          // Try without padding
          const altUrl = `https://assets.tcgdex.net/ja/sv/SV4a/${card.number}`
          const altCheck = await fetch(`${altUrl}/high.webp`, { method: 'HEAD' })
          if (!altCheck.ok) {
            console.error(`❌ No image found for ${card.name} at ${imageUrl} or ${altUrl}`)
            errorCount++
            errors.push({ card: card.card_id, error: 'Image not found on CDN' })
            continue
          }
        }
        
        const imageData = {
          small: `${imageUrl}/low.webp`,
          large: `${imageUrl}/high.webp`,
          tcgdex: `${imageUrl}/high.webp`
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
