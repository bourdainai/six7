import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { POKEMON_NAMES, getEnglishName, isJapaneseName } from "../_shared/pokemon-names.ts";
import { requireCronAuth, handleCORS, createUnauthorizedResponse, getCorsHeaders } from "../_shared/cron-auth.ts";

const corsHeaders = getCorsHeaders();

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCORS();
  }

  // Require cron authentication
  const authResult = await requireCronAuth(req);
  if (!authResult.authorized) {
    console.warn(`Unauthorized access attempt to backfill-english-names: ${authResult.reason}`);
    return createUnauthorizedResponse(authResult.reason);
  }

  console.log(`Authenticated via: ${authResult.authType}`);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { batchSize = 500, dryRun = false } = await req.json().catch(() => ({}));

    console.log(`🚀 Starting English name backfill (batchSize: ${batchSize}, dryRun: ${dryRun})`);

    const { data: cards, error: fetchError } = await supabase
      .from('pokemon_card_attributes')
      .select('id, card_id, name, metadata')
      .is('name_en', null)
      .limit(batchSize);

    if (fetchError) {
      throw new Error(`Failed to fetch cards: ${fetchError.message}`);
    }

    console.log(`📦 Found ${cards?.length || 0} cards to process`);

    if (!cards || cards.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No cards need English names',
          stats: { processed: 0, updated: 0, skipped: 0 }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const updates: Array<{ id: string; name_en: string }> = [];
    const skipped: Array<{ id: string; name: string; reason: string }> = [];
    
    for (const card of cards) {
      if (!isJapaneseName(card.name)) {
        skipped.push({ id: card.id, name: card.name, reason: 'Not Japanese' });
        continue;
      }

      const dexId = card.metadata?.dexId;
      const englishName = getEnglishName(dexId);

      if (englishName) {
        updates.push({ id: card.id, name_en: englishName });
        console.log(`✅ ${card.name} → ${englishName} (dexId: ${dexId})`);
      } else {
        skipped.push({ 
          id: card.id, 
          name: card.name, 
          reason: dexId ? `Unknown dexId: ${dexId}` : 'No dexId (Trainer/Energy card)'
        });
      }
    }

    console.log(`\n📊 Results: ${updates.length} to update, ${skipped.length} skipped`);

    let updatedCount = 0;
    
    if (!dryRun && updates.length > 0) {
      for (let i = 0; i < updates.length; i += 100) {
        const batch = updates.slice(i, i + 100);
        
        for (const update of batch) {
          const { error: updateError } = await supabase
            .from('pokemon_card_attributes')
            .update({ name_en: update.name_en })
            .eq('id', update.id);

          if (updateError) {
            console.error(`❌ Failed to update ${update.id}: ${updateError.message}`);
          } else {
            updatedCount++;
          }
        }
        
        console.log(`   Updated batch ${Math.floor(i / 100) + 1}/${Math.ceil(updates.length / 100)}`);
      }
    }

    const stats = {
      processed: cards.length,
      updated: dryRun ? 0 : updatedCount,
      wouldUpdate: updates.length,
      skipped: skipped.length,
      skippedReasons: skipped.reduce((acc, s) => {
        acc[s.reason] = (acc[s.reason] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    console.log(`\n🎉 Backfill complete!`);
    console.log(`   Processed: ${stats.processed}`);
    console.log(`   Updated: ${stats.updated}`);
    console.log(`   Skipped: ${stats.skipped}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: dryRun ? 'Dry run complete' : 'Backfill complete',
        stats,
        sampleUpdates: updates.slice(0, 10),
        sampleSkipped: skipped.slice(0, 10)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Backfill error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
