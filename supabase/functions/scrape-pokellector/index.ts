import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";
import { requireCronAuth, handleCORS, createUnauthorizedResponse, getCorsHeaders } from "../_shared/cron-auth.ts";

const corsHeaders = getCorsHeaders();

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCORS();
  }

  // Require cron authentication
  const authResult = await requireCronAuth(req);
  if (!authResult.authorized) {
    console.warn(`Unauthorized access attempt to scrape-pokellector: ${authResult.reason}`);
    return createUnauthorizedResponse(authResult.reason);
  }

  console.log(`Authenticated via: ${authResult.authType}`);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { setCode, setId } = await req.json();
    console.log(`🔍 Scraping TCGCollector for set: ${setCode} (ID: ${setId})`);

    // Fetch the set page from TCGCollector
    const url = setId 
      ? `https://www.tcgcollector.com/sets/${setId}/${setCode.toLowerCase().replace(/\s+/g, '-')}`
      : `http://jp.pokellector.com/sets/${setCode}`;
    console.log(`Fetching: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }

    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    
    if (!doc) {
      throw new Error('Failed to parse HTML');
    }

    console.log('Parsing card data...');

    // Extract set name from page
    const titleElement = doc.querySelector('h1, .set-title');
    const setName = titleElement?.textContent?.trim() || setCode;

    // Extract cards from grid items
    const cardElements = doc.querySelectorAll('.card-image-grid-item, .card-search-result-item');
    const cards: any[] = [];

    console.log(`Found ${cardElements.length} card elements`);

    cardElements.forEach((element: any) => {
      const link = element.querySelector('a');
      if (!link) return;

      const titleAttr = link.getAttribute('title');
      if (!titleAttr) return;

      // Parse title like "Oddish (Shiny Treasure ex 001/190)"
      const match = titleAttr.match(/^(.+?)\s*\(.*?(\d+)\/(\d+)\)$/);
      if (!match) return;

      const [_, name, cardNum, totalCards] = match;

      cards.push({
        card_id: `tcgcollector_${setCode}_${cardNum}`.toLowerCase(),
        name: name.trim(),
        set_code: setCode,
        set_name: setName,
        number: cardNum,
        rarity: null,
        images: null,
        sync_source: 'on_demand',
        synced_at: new Date().toISOString()
      });
    });

    console.log(`✅ Scraped ${cards.length} cards from ${setName}`);

    if (cards.length > 0) {
      // Insert cards into database
      const { error: insertError } = await supabase
        .from('pokemon_card_attributes')
        .upsert(cards, { 
          onConflict: 'card_id',
          ignoreDuplicates: false 
        });

      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        setCode,
        setName,
        cardsScraped: cards.length,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Scraping failed:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
