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
    
    // Extract portfolio ID from URL
    const portfolioId = portfolioUrl.split('/').pop();

    // Try to find JSON data in the page (Collectr may embed it)
    const jsonMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*({.+?});/);
    let portfolioData;

    if (jsonMatch) {
      portfolioData = JSON.parse(jsonMatch[1]);
    } else {
      // If no embedded JSON, try calling their API directly
      const apiUrl = `https://api.getcollectr.com/v1/showcase/${portfolioId}`;
      const apiResponse = await fetch(apiUrl);
      if (apiResponse.ok) {
        portfolioData = await apiResponse.json();
      } else {
        throw new Error('Could not extract portfolio data');
      }
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

    // Map portfolio cards to listings format
    const listings = portfolioData.cards?.map((card: any) => ({
      seller_id: user.id,
      title: card.name || `${card.set} - ${card.number}`,
      set_code: card.set,
      card_number: card.number,
      seller_price: card.marketPrice || card.price || 0,
      condition: mapCollectrCondition(card.condition),
      currency: 'GBP',
      status: 'draft',
      portfolio_name: portfolioData.portfolioName || 'Collectr Import',
      import_job_id: importJob.id,
      import_metadata: {
        rarity: card.rarity,
        grade: card.grade,
        variance: card.variance,
        collectr_id: card.id
      }
    })) || [];

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
