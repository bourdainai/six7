import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { seller_id } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Calculating reputation for seller:', seller_id);

    // Fetch seller's completed order data
    const { data: orders } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('seller_id', seller_id)
      .eq('status', 'completed');

    // Fetch cancelled orders for cancellation rate
    const { data: cancelledOrders } = await supabase
      .from('orders')
      .select('id')
      .eq('seller_id', seller_id)
      .eq('status', 'cancelled');

    // Fetch total orders (completed + cancelled) for rate calculation
    const { data: allOrders } = await supabase
      .from('orders')
      .select('id')
      .eq('seller_id', seller_id)
      .in('status', ['completed', 'cancelled']);

    // Fetch seller's ratings
    const { data: ratings } = await supabase
      .from('ratings')
      .select('*')
      .eq('reviewee_id', seller_id);

    // Fetch seller's disputes
    const { data: disputes } = await supabase
      .from('disputes')
      .select('*')
      .eq('seller_id', seller_id);

    // Fetch conversations for response time
    const { data: conversations } = await supabase
      .from('conversations')
      .select('*, messages(*)')
      .eq('seller_id', seller_id);

    // Calculate metrics
    const totalSales = orders?.length || 0;
    const totalRevenue = orders?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;
    const totalReviews = ratings?.length || 0;
    const averageRating = totalReviews > 0 
      ? ratings!.reduce((sum, r) => sum + r.rating, 0) / totalReviews 
      : 0;

    // Calculate disputes metrics
    const disputesWon = disputes?.filter(d => d.ai_recommended_outcome === 'seller_favor').length || 0;
    const disputesLost = disputes?.filter(d => d.ai_recommended_outcome === 'buyer_favor').length || 0;
    
    // Calculate shipment metrics
    const onTimeShipments = orders?.filter(o => {
      if (!o.shipped_at || !o.created_at) return false;
      const shipTime = new Date(o.shipped_at).getTime() - new Date(o.created_at).getTime();
      return shipTime <= 48 * 60 * 60 * 1000; // 48 hours
    }).length || 0;
    const lateShipments = totalSales - onTimeShipments;

    // Calculate response rate and time
    let totalResponseTime = 0;
    let responseCount = 0;
    conversations?.forEach(conv => {
      const messages = conv.messages || [];
      for (let i = 1; i < messages.length; i++) {
        if (messages[i].sender_id === seller_id && messages[i-1].sender_id !== seller_id) {
          const responseTime = new Date(messages[i].created_at).getTime() - new Date(messages[i-1].created_at).getTime();
          totalResponseTime += responseTime;
          responseCount++;
        }
      }
    });
    const avgResponseTimeHours = responseCount > 0 
      ? Math.round(totalResponseTime / responseCount / (1000 * 60 * 60)) 
      : 0;
    const responseRate = conversations?.length || 0 > 0 ? (responseCount / (conversations?.length || 1)) * 100 : 0;

    // Calculate reputation score (0-1000)
    let reputationScore = 500; // Start at 500

    // Sales impact (up to +200)
    reputationScore += Math.min(totalSales * 2, 200);

    // Rating impact (up to +200)
    reputationScore += Math.round(averageRating * 40);

    // Response rate impact (up to +100)
    reputationScore += Math.round(responseRate);

    // Response time impact (up to +50, penalty for slow)
    if (avgResponseTimeHours < 2) reputationScore += 50;
    else if (avgResponseTimeHours < 6) reputationScore += 30;
    else if (avgResponseTimeHours < 24) reputationScore += 10;
    else reputationScore -= 20;

    // Dispute impact (penalty for losses)
    reputationScore -= disputesLost * 20;
    reputationScore += disputesWon * 10;

    // On-time shipping impact (up to +50)
    const onTimeRate = totalSales > 0 ? (onTimeShipments / totalSales) * 100 : 0;
    reputationScore += Math.round(onTimeRate / 2);

    // Clamp score between 0 and 1000
    reputationScore = Math.max(0, Math.min(1000, reputationScore));

    // Determine verification level
    let verificationLevel = 'unverified';
    if (reputationScore >= 900 && totalSales >= 100 && averageRating >= 4.8) {
      verificationLevel = 'top_seller';
    } else if (reputationScore >= 750 && totalSales >= 50 && averageRating >= 4.5) {
      verificationLevel = 'trusted_seller';
    } else if (reputationScore >= 600 && totalSales >= 10 && averageRating >= 4.0) {
      verificationLevel = 'verified_seller';
    }

    // Upsert seller reputation
    const { error: reputationError } = await supabase
      .from('seller_reputation')
      .upsert({
        seller_id,
        reputation_score: reputationScore,
        verification_level: verificationLevel,
        total_sales: totalSales,
        total_revenue: totalRevenue,
        average_rating: averageRating,
        total_reviews: totalReviews,
        response_rate: responseRate,
        avg_response_time_hours: avgResponseTimeHours,
        disputes_won: disputesWon,
        disputes_lost: disputesLost,
        on_time_shipments: onTimeShipments,
        late_shipments: lateShipments,
        cancellation_rate: allOrders && allOrders.length > 0
          ? ((cancelledOrders?.length || 0) / allOrders.length) * 100
          : 0,
        last_calculated_at: new Date().toISOString(),
      });

    if (reputationError) throw reputationError;

    // Award badges based on achievements
    const badgesToAward = [];

    // First sale badge
    if (totalSales >= 1) {
      badgesToAward.push({
        badge_type: 'milestone',
        badge_name: 'First Sale',
        description: 'Completed their first sale'
      });
    }

    // Fast responder badge
    if (avgResponseTimeHours < 2 && responseCount >= 10) {
      badgesToAward.push({
        badge_type: 'service',
        badge_name: 'Fast Responder',
        description: 'Responds to messages within 2 hours'
      });
    }

    // Perfect rating badge
    if (averageRating >= 4.9 && totalReviews >= 20) {
      badgesToAward.push({
        badge_type: 'quality',
        badge_name: 'Perfect Rating',
        description: 'Maintains near-perfect customer ratings'
      });
    }

    // Top seller badge
    if (verificationLevel === 'top_seller') {
      badgesToAward.push({
        badge_type: 'verification',
        badge_name: 'Top Seller',
        description: 'Elite seller with exceptional performance'
      });
    }

    // Trusted seller badge
    if (verificationLevel === 'trusted_seller') {
      badgesToAward.push({
        badge_type: 'verification',
        badge_name: 'Trusted Seller',
        description: 'Trusted seller with proven track record'
      });
    }

    // Verified seller badge
    if (verificationLevel === 'verified_seller') {
      badgesToAward.push({
        badge_type: 'verification',
        badge_name: 'Verified Seller',
        description: 'Verified seller with good standing'
      });
    }

    // 100 sales milestone
    if (totalSales >= 100) {
      badgesToAward.push({
        badge_type: 'milestone',
        badge_name: '100 Sales',
        description: 'Reached 100 successful sales'
      });
    }

    // Insert new badges (skip if already exists)
    for (const badge of badgesToAward) {
      const { data: existingBadge } = await supabase
        .from('seller_badges')
        .select('id')
        .eq('seller_id', seller_id)
        .eq('badge_name', badge.badge_name)
        .single();

      if (!existingBadge) {
        await supabase.from('seller_badges').insert({
          seller_id,
          ...badge,
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        reputation_score: reputationScore,
        verification_level: verificationLevel,
        badges_awarded: badgesToAward.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error calculating reputation:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
