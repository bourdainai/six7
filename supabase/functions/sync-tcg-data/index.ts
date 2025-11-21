import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const POKEMON_API_URL = "https://api.pokemontcg.io/v2";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const tcgApiKey = Deno.env.get('POKEMON_TCG_API_KEY') ?? '';

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if this is a cron job (no auth required) or admin request
    const authHeader = req.headers.get('Authorization');
    const isCronJob = !authHeader || authHeader.includes('cron-secret');
    
    let isAdmin = false;
    if (authHeader && !isCronJob) {
      const { data: { user }, error: userError } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      );
      
      if (!userError && user) {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .single();
        
        isAdmin = !!roles;
      }
    }

    // Allow cron jobs or admin requests
    if (!isCronJob && !isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Admin access or cron secret required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const { 
      setCode, 
      page = 1, 
      priorityTier = null,
      autoSelectSet = false // If true, automatically select next set to sync based on priority
    } = body;

    // Auto-select set based on priority if requested (for cron jobs)
    let targetSetCode = setCode;
    let targetSetName = '';
    
    if (autoSelectSet && !setCode) {
      // Find next set to sync based on priority
      const { data: nextSet } = await supabase
        .from('tcg_sync_progress')
        .select('set_code, set_name, priority_tier, sync_status, last_page_synced')
        .in('sync_status', ['pending', 'in_progress'])
        .order('priority_tier', { ascending: true })
        .order('last_sync_at', { ascending: true, nullsFirst: true })
        .limit(1)
        .single();

      if (nextSet) {
        targetSetCode = nextSet.set_code;
        targetSetName = nextSet.set_name || '';
        console.log(`Auto-selected set: ${targetSetCode} (Tier ${nextSet.priority_tier})`);
      } else {
        // Check popular_sets for new sets to sync
        const { data: popularSet } = await supabase
          .from('popular_sets')
          .select('set_code, set_name, priority_tier')
          .eq('is_active', true)
          .order('priority_tier', { ascending: true })
          .limit(1)
          .single();

        if (popularSet) {
          // Check if sync progress exists
          const { data: existingProgress } = await supabase
            .from('tcg_sync_progress')
            .select('*')
            .eq('set_code', popularSet.set_code)
            .single();

          if (!existingProgress) {
            // Create new sync progress entry
            await supabase
              .from('tcg_sync_progress')
              .insert({
                set_code: popularSet.set_code,
                set_name: popularSet.set_name,
                priority_tier: popularSet.priority_tier,
                sync_status: 'pending',
                last_page_synced: 0,
                synced_cards: 0
              });

            targetSetCode = popularSet.set_code;
            targetSetName = popularSet.set_name;
            console.log(`Created sync progress for new set: ${targetSetCode}`);
          }
        }
      }
    }

    if (!targetSetCode) {
      return new Response(
        JSON.stringify({ error: 'No set specified and no sets available for auto-sync' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update sync status to in_progress
    await supabase
      .from('tcg_sync_progress')
      .update({ 
        sync_status: 'in_progress',
        updated_at: new Date().toISOString()
      })
      .eq('set_code', targetSetCode);

    console.log(`Syncing TCG data. Set: ${targetSetCode}, Page: ${page}`);

    const apiUrl = new URL(`${POKEMON_API_URL}/cards`);
    apiUrl.searchParams.append('q', `set.id:${targetSetCode}`);
    apiUrl.searchParams.append('page', page.toString());
    apiUrl.searchParams.append('pageSize', '2000');

    const tcgResponse = await fetch(apiUrl.toString(), {
      headers: {
        'X-Api-Key': tcgApiKey,
      },
    });

    if (!tcgResponse.ok) {
      // Update sync status to failed
      await supabase
        .from('tcg_sync_progress')
        .update({ 
          sync_status: 'failed',
          error_message: `API Error: ${tcgResponse.statusText}`,
          updated_at: new Date().toISOString()
        })
        .eq('set_code', targetSetCode);

      throw new Error(`TCG API Error: ${tcgResponse.statusText}`);
    }

    const tcgData = await tcgResponse.json();
    const cards = tcgData.data || [];

    if (cards.length === 0) {
      // Mark as completed if no more cards
      await supabase
        .from('tcg_sync_progress')
        .update({ 
          sync_status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('set_code', targetSetCode);

      return new Response(
        JSON.stringify({ message: 'No more cards found to sync', setCode: targetSetCode }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare card data with sync metadata
    const now = new Date().toISOString();
    const cardIds = cards.map((card: any) => card.id);
    
    // Check which cards already exist
    const { data: existingCards } = await supabase
      .from('pokemon_card_attributes')
      .select('card_id')
      .in('card_id', cardIds);
    
    const existingCardIds = new Set(existingCards?.map(c => c.card_id) || []);
    
    // Separate new cards from existing cards
    const newCards = cards.filter((card: any) => !existingCardIds.has(card.id));
    const existingCardsToUpdate = cards.filter((card: any) => existingCardIds.has(card.id));
    
    let insertCount = 0;
    let updateCount = 0;
    
    // Insert NEW cards with all data
    if (newCards.length > 0) {
      const insertData = newCards.map((card: any) => ({
        card_id: card.id,
        name: card.name,
        set_name: card.set.name,
        set_code: card.set.id,
        number: card.number,
        rarity: card.rarity,
        artist: card.artist,
        types: card.types || [],
        subtypes: card.subtypes || [],
        supertype: card.supertype,
        images: card.images || {},
        tcgplayer_id: card.tcgplayer?.url?.split('/').pop(),
        cardmarket_id: card.cardmarket?.url?.split('/').pop(),
        tcgplayer_prices: card.tcgplayer?.prices || null,
        cardmarket_prices: card.cardmarket?.prices || null,
        last_price_update: card.tcgplayer?.prices || card.cardmarket?.prices ? now : null,
        synced_at: now,
        sync_source: isCronJob ? 'cron' : 'manual',
        updated_at: now,
      }));
      
      const { error: insertError } = await supabase
        .from('pokemon_card_attributes')
        .insert(insertData);
      
      if (insertError) {
        console.error('Insert Error:', insertError);
        throw insertError;
      }
      
      insertCount = newCards.length;
      console.log(`✅ Inserted ${insertCount} new cards`);
    }
    
    // Update EXISTING cards - ONLY price fields
    if (existingCardsToUpdate.length > 0) {
      for (const card of existingCardsToUpdate) {
        const hasPrices = card.tcgplayer?.prices || card.cardmarket?.prices;
        
        const { error: updateError } = await supabase
          .from('pokemon_card_attributes')
          .update({
            tcgplayer_prices: card.tcgplayer?.prices || null,
            cardmarket_prices: card.cardmarket?.prices || null,
            last_price_update: hasPrices ? now : null,
            updated_at: now,
          })
          .eq('card_id', card.id);
        
        if (updateError) {
          console.error(`Update Error for ${card.id}:`, updateError);
          // Continue with other updates even if one fails
        } else {
          updateCount++;
        }
      }
      
      console.log(`✅ Updated prices for ${updateCount} existing cards`);
    }


    // Calculate if sync is complete
    const totalPages = Math.ceil((tcgData.totalCount || 0) / 2000);
    const isComplete = page >= totalPages;

    // Update sync progress
    const { data: currentProgress } = await supabase
      .from('tcg_sync_progress')
      .select('synced_cards')
      .eq('set_code', targetSetCode)
      .single();

    const newSyncedCount = (currentProgress?.synced_cards || 0) + cards.length;

    await supabase
      .from('tcg_sync_progress')
      .update({ 
        last_page_synced: page,
        total_cards: tcgData.totalCount || 0,
        synced_cards: newSyncedCount,
        last_sync_at: now,
        sync_status: isComplete ? 'completed' : 'in_progress',
        updated_at: now
      })
      .eq('set_code', targetSetCode);

    return new Response(
      JSON.stringify({ 
        message: `Synced ${cards.length} cards (${insertCount} new, ${updateCount} price updates)`,
        setCode: targetSetCode,
        setName: targetSetName,
        newCards: insertCount,
        priceUpdates: updateCount,
        totalProcessed: cards.length,
        totalCount: tcgData.totalCount,
        page: page,
        totalPages: totalPages,
        syncedCards: newSyncedCount,
        isComplete: isComplete
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
