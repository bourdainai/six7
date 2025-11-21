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

    const { region, setCode, batchSize = 100 } = await req.json();

    console.log(`🔍 Starting image validation for region=${region}, setCode=${setCode}`);

    // Build query
    let query = supabase
      .from('pokemon_card_attributes')
      .select('id, card_id, set_code, number, name, images, metadata')
      .not('images', 'is', null);

    if (region) {
      query = query.eq('metadata->>region', region);
    }
    if (setCode) {
      query = query.eq('set_code', setCode);
    }

    const { data: cards, error: fetchError } = await query.limit(batchSize);

    if (fetchError) {
      throw fetchError;
    }

    console.log(`📦 Found ${cards?.length || 0} cards to validate`);

    const results = {
      total: 0,
      checked: 0,
      ok: 0,
      broken: 0,
      errors: [] as string[]
    };

    if (!cards || cards.length === 0) {
      return new Response(JSON.stringify(results), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate images in batches
    for (const card of cards) {
      results.total++;

      try {
        const imageUrl = card.images?.small || card.images?.large;
        if (!imageUrl) {
          results.broken++;
          continue;
        }

        // Perform HEAD request to check if image exists
        const response = await fetch(imageUrl, {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });

        const imageOk = response.ok && response.status === 200;
        results.checked++;

        if (imageOk) {
          results.ok++;
        } else {
          results.broken++;
        }

        // Update metadata with image health status
        const updatedMetadata = {
          ...(card.metadata || {}),
          image_ok: imageOk,
          image_checked_at: new Date().toISOString(),
          image_status_code: response.status
        };

        await supabase
          .from('pokemon_card_attributes')
          .update({ 
            metadata: updatedMetadata,
            updated_at: new Date().toISOString()
          })
          .eq('id', card.id);

        console.log(`✓ ${card.set_code}/${card.number}: ${imageOk ? 'OK' : 'BROKEN'} (${response.status})`);

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        results.broken++;
        results.errors.push(`${card.set_code}/${card.number}: ${errorMsg}`);
        console.error(`✗ ${card.set_code}/${card.number}: ${errorMsg}`);

        // Mark as broken in metadata
        const updatedMetadata = {
          ...(card.metadata || {}),
          image_ok: false,
          image_checked_at: new Date().toISOString(),
          image_error: errorMsg
        };

        await supabase
          .from('pokemon_card_attributes')
          .update({ 
            metadata: updatedMetadata,
            updated_at: new Date().toISOString()
          })
          .eq('id', card.id);
      }
    }

    console.log(`✅ Validation complete: ${results.ok}/${results.total} OK, ${results.broken} broken`);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Image validation error:', error);
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});