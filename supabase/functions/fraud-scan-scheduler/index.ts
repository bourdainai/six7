import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireAdmin, createErrorResponse, handleCORS } from '../_shared/admin-middleware.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCORS();
  }

  try {
    // Require admin authentication
    await requireAdmin(req);
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting fraud scan for new listings...');

    // Get listings created in the last 24 hours that haven't been scanned
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const { data: recentListings, error: listingsError } = await supabase
      .from('listings')
      .select('id, seller_id')
      .gte('created_at', yesterday.toISOString())
      .eq('status', 'active');

    if (listingsError) throw listingsError;

    console.log(`Scanning ${recentListings.length} recent listings for fraud...`);

    let scansCompleted = 0;
    let flagsCreated = 0;

    for (const listing of recentListings) {
      try {
        // Check if already scanned
        const { data: existingFlags } = await supabase
          .from('fraud_flags')
          .select('id')
          .eq('listing_id', listing.id)
          .single();

        if (existingFlags) continue; // Already scanned

        // Run image forensics
        const { data: forensicsResult, error: forensicsError } = await supabase.functions.invoke(
          'fraud-image-forensics',
          {
            body: { listing_id: listing.id }
          }
        );

        if (!forensicsError && forensicsResult?.flagsCreated > 0) {
          flagsCreated += forensicsResult.flagsCreated;
        }

        // Run duplicate detector
        const { data: duplicateResult, error: duplicateError } = await supabase.functions.invoke(
          'fraud-duplicate-detector',
          {
            body: { listing_id: listing.id }
          }
        );

        if (!duplicateError && duplicateResult?.duplicatesFound > 0) {
          flagsCreated++;
        }

        scansCompleted++;
      } catch (error) {
        console.error(`Error scanning listing ${listing.id}:`, error);
      }
    }

    console.log(`Fraud scan complete. Scanned: ${scansCompleted}, Flags created: ${flagsCreated}`);

    return new Response(
      JSON.stringify({
        success: true,
        scanned: scansCompleted,
        flagsCreated
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Fraud scan failed:', error);
    
    // Handle auth errors from requireAdmin
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return createErrorResponse(error);
    }
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
