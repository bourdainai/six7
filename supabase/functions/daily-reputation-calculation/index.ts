import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting daily reputation calculation...');

    // Get all sellers with listings or orders
    const { data: sellers, error: sellersError } = await supabase
      .from('profiles')
      .select('id')
      .not('id', 'is', null);

    if (sellersError) throw sellersError;

    console.log(`Processing ${sellers.length} sellers...`);

    let processedCount = 0;
    let errorCount = 0;

    for (const seller of sellers) {
      try {
        // Call the reputation calculation function
        const { error: calcError } = await supabase.functions.invoke(
          'calculate-seller-reputation',
          {
            body: { sellerId: seller.id }
          }
        );

        if (calcError) {
          console.error(`Error calculating reputation for seller ${seller.id}:`, calcError);
          errorCount++;
        } else {
          processedCount++;
        }
      } catch (error) {
        console.error(`Failed to process seller ${seller.id}:`, error);
        errorCount++;
      }
    }

    console.log(`Reputation calculation complete. Processed: ${processedCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        errors: errorCount,
        total: sellers.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Daily reputation calculation failed:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
