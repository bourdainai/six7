import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { setCode } = await req.json();
    console.log(`🔍 Scraping Pokellector for set: ${setCode}`);

    // Fetch the set page from Pokellector
    const url = `http://jp.pokellector.com/sets/${setCode}`;
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

    // Extract set name
    const setNameElement = doc.querySelector('h1');
    const setName = setNameElement?.textContent?.trim() || setCode;

    // Extract all cards from the list
    const cardElements = doc.querySelectorAll('.card-item, .pokemon-card');
    const cards: any[] = [];

    cardElements.forEach((element: any) => {
      const numberElement = element.querySelector('.card-number, .number');
      const nameElement = element.querySelector('.card-name, .name');
      const imageElement = element.querySelector('img');
      const rarityElement = element.querySelector('.rarity');

      if (numberElement && nameElement) {
        const number = numberElement.textContent?.trim();
        const name = nameElement.textContent?.trim();
        const imageUrl = imageElement?.getAttribute('src');
        const rarity = rarityElement?.textContent?.trim();

        cards.push({
          card_id: `pokellector_${setCode}_${number}`.toLowerCase(),
          name,
          set_code: setCode,
          set_name: setName,
          number,
          display_number: number,
          search_number: number?.replace(/\D/g, ''),
          rarity: rarity || null,
          images: imageUrl ? {
            small: imageUrl,
            large: imageUrl.replace('/sm/', '/lg/')
          } : null,
          sync_source: 'pokellector',
          synced_at: new Date().toISOString()
        });
      }
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
