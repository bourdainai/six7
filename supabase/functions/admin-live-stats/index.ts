import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { requireAdmin, createErrorResponse, handleCORS } from "../_shared/admin-middleware.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCORS();
  }

  try {
    await requireAdmin(req);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get live stats
    const { data: liveStats } = await supabase
      .from('admin_live_stats')
      .select('*')
      .single();

    // Get top sellers by revenue
    const { data: topSellers } = await supabase.rpc('get_top_sellers', { limit_count: 10 });

    // Get top buyers by spend
    const { data: topBuyers } = await supabase.rpc('get_top_buyers', { limit_count: 10 });

    // Get active users count (sessions in last 24h)
    const { count: activeUsers } = await supabase
      .from('user_sessions')
      .select('user_id', { count: 'exact', head: true })
      .eq('is_active', true)
      .gte('last_activity_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    // Get promo stats
    const { count: promoSignups } = await supabase
      .from('promotional_signups')
      .select('*', { count: 'exact', head: true });

    const { count: activatedPromos } = await supabase
      .from('promotional_signups')
      .select('*', { count: 'exact', head: true })
      .not('activated_at', 'is', null);

    return new Response(
      JSON.stringify({
        liveStats,
        topSellers: topSellers || [],
        topBuyers: topBuyers || [],
        activeUsers: activeUsers || 0,
        promoStats: {
          total: promoSignups || 0,
          activated: activatedPromos || 0,
          remaining: Math.max(0, 250 - (promoSignups || 0)),
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching live stats:', error);
    return createErrorResponse(error as Error);
  }
});