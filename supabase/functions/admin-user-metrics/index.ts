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

    const url = new URL(req.url);
    const userId = url.searchParams.get('user_id');
    const limit = parseInt(url.searchParams.get('limit') || '50');

    if (userId) {
      // Get detailed metrics for a specific user
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const { data: activities } = await supabase
        .from('user_activity_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      const { count: messageCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('sender_id', userId);

      const { count: listingCount } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', userId);

      const { count: offerCount } = await supabase
        .from('offers')
        .select('*', { count: 'exact', head: true })
        .eq('buyer_id', userId);

      const { data: purchases } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('buyer_id', userId)
        .eq('status', 'completed');

      const { data: sales } = await supabase
        .from('orders')
        .select('seller_amount')
        .eq('seller_id', userId)
        .eq('status', 'completed');

      const totalSpent = purchases?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;
      const totalEarned = sales?.reduce((sum, order) => sum + Number(order.seller_amount), 0) || 0;

      return new Response(
        JSON.stringify({
          profile,
          activities,
          metrics: {
            total_messages: messageCount || 0,
            total_listings: listingCount || 0,
            total_offers: offerCount || 0,
            total_spent: totalSpent,
            total_earned: totalEarned,
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Get recent user activity overview
      const { data: recentUsers } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          created_at,
          last_ip_address,
          last_city,
          last_country
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      // Get activity counts for each user
      const usersWithMetrics = await Promise.all(
        (recentUsers || []).map(async (user) => {
          const { count: messageCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('sender_id', user.id);

          const { count: listingCount } = await supabase
            .from('listings')
            .select('*', { count: 'exact', head: true })
            .eq('seller_id', user.id);

          const { data: lastActivity } = await supabase
            .from('user_activity_logs')
            .select('created_at, activity_type')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            ...user,
            message_count: messageCount || 0,
            listing_count: listingCount || 0,
            last_activity: lastActivity?.created_at,
            last_activity_type: lastActivity?.activity_type
          };
        })
      );

      return new Response(
        JSON.stringify({ users: usersWithMetrics }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error fetching user metrics:', error);
    return createErrorResponse(error as Error);
  }
});
