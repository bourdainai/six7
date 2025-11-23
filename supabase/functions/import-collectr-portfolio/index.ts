import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

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

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { portfolioUrl } = await req.json();

    if (!portfolioUrl || !portfolioUrl.includes('app.getcollectr.com/showcase/profile/')) {
      throw new Error('Invalid Collectr portfolio URL');
    }

    console.log('Fetching portfolio:', portfolioUrl);

    // Fetch portfolio data from Collectr
    // Note: This may require scraping or API access
    const portfolioResponse = await fetch(portfolioUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; 6SevenBot/1.0)',
        'Accept': 'application/json, text/html',
      }
    });

    if (!portfolioResponse.ok) {
      throw new Error('Failed to fetch portfolio data');
    }

    const html = await portfolioResponse.text();
    
    // Extract portfolio ID from URL for metadata
    const portfolioId = portfolioUrl.split('/').pop();
    
    console.log('HTML length:', html.length);

    // Try multiple patterns to extract JSON data
    let portfolioData: any = null;
    
    // Pattern 1: window.__INITIAL_STATE__
    let jsonMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*({.+?});/s);
    
    // Pattern 2: window.__NEXT_DATA__
    if (!jsonMatch) {
      jsonMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.+?)<\/script>/s);
    }
    
    // Pattern 3: Any large JSON object in script tags
    if (!jsonMatch) {
      const scriptMatches = html.match(/<script[^>]*>(.+?)<\/script>/gs);
      if (scriptMatches) {
        for (const script of scriptMatches) {
          const content = script.replace(/<script[^>]*>|<\/script>/g, '').trim();
          if (content.startsWith('{') && content.length > 100) {
            try {
              portfolioData = JSON.parse(content);
              if (portfolioData.props?.pageProps || portfolioData.cards) {
                jsonMatch = [content, content];
                break;
              }
            } catch (e) {
              // Not valid JSON, continue
            }
          }
        }
      }
    }

    if (jsonMatch) {
      try {
        portfolioData = JSON.parse(jsonMatch[1]);
        console.log('Parsed portfolio data:', Object.keys(portfolioData));
      } catch (e) {
        console.error('JSON parse error:', e);
        throw new Error('Failed to parse portfolio JSON data');
      }
    } else {
      throw new Error('Could not find portfolio data in page. The Collectr page format may have changed.');
    }

    // Create import job
    const { data: importJob, error: jobError } = await supabase
      .from('import_jobs')
      .insert({
        user_id: user.id,
        source: 'portfolio_url',
        total_items: portfolioData.cards?.length || 0,
        metadata: { portfolioUrl, portfolioId }
      })
      .select()
      .single();

    if (jobError) throw jobError;

    // Extract cards from various possible data structures
    let cards: any[] = [];
    
    if (portfolioData.cards) {
      cards = portfolioData.cards;
    } else if (portfolioData.props?.pageProps?.cards) {
      cards = portfolioData.props.pageProps.cards;
    } else if (portfolioData.props?.pageProps?.portfolio?.cards) {
      cards = portfolioData.props.pageProps.portfolio.cards;
    }

    console.log(`Found ${cards.length} cards to import`);

    if (cards.length === 0) {
      throw new Error('No cards found in portfolio. The portfolio may be empty or the format has changed.');
    }

    // Map portfolio cards to listings format
    const listings = cards.map((card: any) => {
      // Handle various card data formats
      const cardName = card.name || card.cardName || card.title;
      const setName = card.set || card.setName || card.set_name;
      const cardNumber = card.number || card.cardNumber || card.card_number;
      const price = parseFloat(card.marketPrice || card.price || card.value || '0');
      const condition = card.condition || card.cardCondition || 'Near Mint';
      const quantity = parseInt(card.quantity || card.qty || '1');

      return {
        seller_id: user.id,
        title: cardName || `${setName} - ${cardNumber}`,
        set_code: setName,
        card_number: cardNumber,
        seller_price: price > 0 ? price : 1,
        condition: mapCollectrCondition(condition),
        currency: 'GBP',
        status: 'draft',
        portfolio_name: portfolioData.portfolioName || portfolioData.props?.pageProps?.portfolio?.name || 'Collectr Import',
        import_job_id: importJob.id,
        import_metadata: {
          rarity: card.rarity,
          grade: card.grade,
          variance: card.variance,
          collectr_id: card.id,
          quantity
        }
      };
    });

    let successCount = 0;
    let failedCount = 0;

    // Insert in batches
    const BATCH_SIZE = 50;
    for (let i = 0; i < listings.length; i += BATCH_SIZE) {
      const batch = listings.slice(i, i + BATCH_SIZE);
      const { error: insertError } = await supabase
        .from('listings')
        .insert(batch);

      if (insertError) {
        console.error('Insert error:', insertError);
        failedCount += batch.length;
      } else {
        successCount += batch.length;
      }
    }

    // Update import job
    await supabase
      .from('import_jobs')
      .update({
        status: 'completed',
        processed_items: successCount,
        failed_items: failedCount,
        completed_at: new Date().toISOString()
      })
      .eq('id', importJob.id);

    return new Response(
      JSON.stringify({
        success: true,
        imported: successCount,
        failed: failedCount,
        jobId: importJob.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function mapCollectrCondition(condition: string): string {
  const map: Record<string, string> = {
    'Near Mint': 'like_new',
    'Lightly Played': 'excellent',
    'Moderately Played': 'good',
    'Heavily Played': 'fair',
    'Damaged': 'poor'
  };
  return map[condition] || 'good';
}
