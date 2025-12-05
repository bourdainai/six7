import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('📊 Generating data quality report...');

    // 1. Card image stats
    const { count: totalCards } = await supabase
      .from('pokemon_card_attributes')
      .select('*', { count: 'exact', head: true });

    const { count: cardsWithImages } = await supabase
      .from('pokemon_card_attributes')
      .select('*', { count: 'exact', head: true })
      .not('images', 'is', null)
      .not('images->small', 'is', null);

    const { count: cardsMissingImages } = await supabase
      .from('pokemon_card_attributes')
      .select('*', { count: 'exact', head: true })
      .or('images.is.null,images->small.is.null');

    // 2. Price data stats
    const { count: cardsWithTcgplayerPrices } = await supabase
      .from('pokemon_card_attributes')
      .select('*', { count: 'exact', head: true })
      .not('tcgplayer_prices', 'is', null);

    const { count: cardsWithCardmarketPrices } = await supabase
      .from('pokemon_card_attributes')
      .select('*', { count: 'exact', head: true })
      .not('cardmarket_prices', 'is', null);

    const { count: cardsWithAnyPrice } = await supabase
      .from('pokemon_card_attributes')
      .select('*', { count: 'exact', head: true })
      .or('tcgplayer_prices.not.is.null,cardmarket_prices.not.is.null');

    // 3. Stale price data (>30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { count: stalePriceData } = await supabase
      .from('pokemon_card_attributes')
      .select('*', { count: 'exact', head: true })
      .not('last_price_update', 'is', null)
      .lt('last_price_update', thirtyDaysAgo.toISOString());

    // 4. Listing stats
    const { count: totalListings } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true });

    const { count: listingsWithCardId } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .not('card_id', 'is', null);

    const { count: listingsWithoutCardId } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .is('card_id', null);

    // 5. Description quality (check for markdown artifacts)
    const { count: descriptionsWithMarkdown } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .or('description.ilike.%**%,description.ilike.%##%');

    // 6. Cards missing images by set
    const { data: missingImagesBySet } = await supabase
      .from('pokemon_card_attributes')
      .select('set_code')
      .or('images.is.null,images->small.is.null');

    const setImageCounts: Record<string, number> = {};
    for (const card of missingImagesBySet || []) {
      setImageCounts[card.set_code] = (setImageCounts[card.set_code] || 0) + 1;
    }

    // Sort by count descending
    const topMissingImageSets = Object.entries(setImageCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([set_code, count]) => ({ set_code, count }));

    // 7. Sync source distribution
    const { data: syncSourceData } = await supabase
      .from('pokemon_card_attributes')
      .select('sync_source');

    const syncSources: Record<string, number> = {};
    for (const card of syncSourceData || []) {
      const source = card.sync_source || 'unknown';
      syncSources[source] = (syncSources[source] || 0) + 1;
    }

    // 8. Sample cards missing images (for debugging)
    const { data: sampleMissingImages } = await supabase
      .from('pokemon_card_attributes')
      .select('card_id, name, set_code, number, sync_source')
      .or('images.is.null,images->small.is.null')
      .limit(10);

    // Generate report
    const report = {
      generated_at: new Date().toISOString(),
      cards: {
        total: totalCards || 0,
        with_images: cardsWithImages || 0,
        missing_images: cardsMissingImages || 0,
        image_coverage: totalCards ? Math.round(((cardsWithImages || 0) / totalCards) * 100) : 0
      },
      pricing: {
        with_tcgplayer_prices: cardsWithTcgplayerPrices || 0,
        with_cardmarket_prices: cardsWithCardmarketPrices || 0,
        with_any_price: cardsWithAnyPrice || 0,
        price_coverage: totalCards ? Math.round(((cardsWithAnyPrice || 0) / totalCards) * 100) : 0,
        stale_price_data: stalePriceData || 0
      },
      listings: {
        total: totalListings || 0,
        linked_to_catalog: listingsWithCardId || 0,
        unlinked: listingsWithoutCardId || 0,
        link_coverage: totalListings ? Math.round(((listingsWithCardId || 0) / totalListings) * 100) : 0,
        with_markdown_artifacts: descriptionsWithMarkdown || 0
      },
      issues: {
        top_sets_missing_images: topMissingImageSets,
        sample_missing_images: sampleMissingImages || [],
        sync_source_distribution: syncSources
      },
      recommendations: [] as string[]
    };

    // Generate recommendations
    if ((cardsMissingImages || 0) > 0) {
      report.recommendations.push(
        `Fix ${cardsMissingImages} cards missing images. Top sets: ${topMissingImageSets.slice(0, 3).map(s => s.set_code).join(', ')}`
      );
    }

    if (report.pricing.price_coverage < 50) {
      report.recommendations.push(
        `Price coverage is only ${report.pricing.price_coverage}%. Run sync-tcgdex-unified to fetch pricing data.`
      );
    }

    if ((stalePriceData || 0) > 100) {
      report.recommendations.push(
        `${stalePriceData} cards have stale prices (>30 days). Run sync-tcgdex-unified with updatePricesOnly=true.`
      );
    }

    if (report.listings.link_coverage < 50) {
      report.recommendations.push(
        `Only ${report.listings.link_coverage}% of listings linked to card catalog. Run auto-match-listings.`
      );
    }

    if ((descriptionsWithMarkdown || 0) > 0) {
      report.recommendations.push(
        `${descriptionsWithMarkdown} listings have markdown artifacts in descriptions. Run cleanup SQL.`
      );
    }

    console.log('✅ Report generated');
    console.log(`📊 Cards: ${report.cards.total} total, ${report.cards.image_coverage}% with images`);
    console.log(`💰 Pricing: ${report.pricing.price_coverage}% coverage`);
    console.log(`📦 Listings: ${report.listings.link_coverage}% linked to catalog`);

    return new Response(
      JSON.stringify(report),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Report error:', error);
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

