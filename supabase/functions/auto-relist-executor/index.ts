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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting auto-relist execution...');

    // Get all active automation rules
    const { data: rules, error: rulesError } = await supabase
      .from('seller_automation_rules')
      .select('*')
      .eq('enabled', true)
      .eq('rule_type', 'auto_relist');

    if (rulesError) {
      throw new Error(`Failed to fetch rules: ${rulesError.message}`);
    }

    console.log(`Found ${rules?.length || 0} active auto-relist rules`);

    let relistCount = 0;
    let errorCount = 0;

    for (const rule of rules || []) {
      try {
        const conditions = rule.conditions as any;
        const actions = rule.actions as any;

        // Build query based on conditions
        let query = supabase
          .from('listings')
          .select('*')
          .eq('seller_id', rule.seller_id)
          .eq('status', 'active');

        // Apply stale risk condition
        if (conditions.min_stale_risk_score) {
          query = query.gte('stale_risk_score', conditions.min_stale_risk_score);
        }

        // Apply days listed condition
        if (conditions.days_listed_min) {
          const minDate = new Date();
          minDate.setDate(minDate.getDate() - conditions.days_listed_min);
          query = query.lte('created_at', minDate.toISOString());
        }

        // Apply view threshold
        if (conditions.max_views_per_day !== undefined) {
          // This is a rough filter - in production you'd calculate views per day
          const estimatedMaxViews = conditions.max_views_per_day * 30;
          query = query.lte('views', estimatedMaxViews);
        }

        const { data: listings, error: listingsError } = await query;

        if (listingsError) {
          console.error(`Error fetching listings for rule ${rule.id}:`, listingsError);
          errorCount++;
          continue;
        }

        console.log(`Found ${listings?.length || 0} listings matching rule ${rule.id}`);

        // Process each listing according to actions
        for (const listing of listings || []) {
          const updates: any = {};

          if (actions.reduce_price_by_percentage) {
            const reduction = actions.reduce_price_by_percentage / 100;
            updates.seller_price = Math.round(listing.seller_price * (1 - reduction) * 100) / 100;
          }

          if (actions.mark_as_quick_sale) {
            updates.quick_sale_price = updates.seller_price || listing.seller_price;
          }

          if (actions.refresh_listing) {
            updates.published_at = new Date().toISOString();
            updates.updated_at = new Date().toISOString();
          }

          if (actions.update_tags && actions.new_tags) {
            updates.style_tags = actions.new_tags;
          }

          // Apply updates
          if (Object.keys(updates).length > 0) {
            const { error: updateError } = await supabase
              .from('listings')
              .update(updates)
              .eq('id', listing.id);

            if (updateError) {
              console.error(`Failed to update listing ${listing.id}:`, updateError);
              errorCount++;
            } else {
              console.log(`Successfully relisted: ${listing.title}`);
              relistCount++;

              // Create notification for seller
              await supabase.from('notifications').insert({
                user_id: rule.seller_id,
                type: 'auto_relist',
                title: 'Listing Auto-Updated',
                message: `Your listing "${listing.title}" was automatically refreshed by your automation rule.`,
                link: `/listing/${listing.id}`,
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error processing rule ${rule.id}:`, error);
        errorCount++;
      }
    }

    console.log(`Auto-relist complete: ${relistCount} listings updated, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        relisted_count: relistCount,
        error_count: errorCount,
        rules_processed: rules?.length || 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Auto-relist executor error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
