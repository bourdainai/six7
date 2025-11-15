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

    console.log('Collecting seller analytics for yesterday...');

    // Get yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    // Get all sellers
    const { data: sellers, error: sellersError } = await supabase
      .from('profiles')
      .select('id');

    if (sellersError) throw sellersError;

    let processedCount = 0;

    for (const seller of sellers) {
      try {
        // Get yesterday's orders for this seller
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select('total_amount, seller_amount')
          .eq('seller_id', seller.id)
          .eq('status', 'completed')
          .gte('created_at', `${dateStr}T00:00:00`)
          .lt('created_at', `${dateStr}T23:59:59`);

        if (ordersError) throw ordersError;

        // Calculate revenue and sales
        const totalRevenue = orders.reduce((sum, order) => sum + Number(order.seller_amount), 0);
        const totalSales = orders.length;

        // Get views for seller's listings (approximation from listing table)
        const { data: listings, error: listingsError } = await supabase
          .from('listings')
          .select('views, saves')
          .eq('seller_id', seller.id);

        if (listingsError) throw listingsError;

        const totalViews = listings.reduce((sum, listing) => sum + (listing.views || 0), 0);
        const totalSaves = listings.reduce((sum, listing) => sum + (listing.saves || 0), 0);

        // Get message count (approximation)
        const { data: conversations } = await supabase
          .from('conversations')
          .select('id')
          .eq('seller_id', seller.id);

        let messageCount = 0;
        if (conversations && conversations.length > 0) {
          const conversationIds = conversations.map(c => c.id);
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .in('conversation_id', conversationIds)
            .gte('created_at', `${dateStr}T00:00:00`)
            .lt('created_at', `${dateStr}T23:59:59`);

          messageCount = count || 0;
        }

        // Calculate conversion rate
        const conversionRate = totalViews > 0 ? (totalSales / totalViews) * 100 : 0;
        const avgSalePrice = totalSales > 0 ? totalRevenue / totalSales : 0;

        // Insert or update analytics
        const { error: analyticsError } = await supabase
          .from('seller_analytics')
          .upsert({
            seller_id: seller.id,
            date: dateStr,
            total_revenue: totalRevenue,
            total_sales: totalSales,
            total_views: totalViews,
            total_saves: totalSaves,
            total_messages: messageCount,
            conversion_rate: conversionRate,
            avg_sale_price: avgSalePrice,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'seller_id,date'
          });

        if (analyticsError) throw analyticsError;

        processedCount++;
      } catch (error) {
        console.error(`Error processing seller ${seller.id}:`, error);
      }
    }

    console.log(`Analytics collection complete. Processed ${processedCount} sellers`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        date: dateStr
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Analytics collection failed:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
