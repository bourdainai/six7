import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { tradeId, action } = await req.json();
    // action can be: 'mark_shipped', 'mark_received', 'release_escrow'

    const { data: trade, error: fetchError } = await supabaseClient
      .from("trade_offers")
      .select("*")
      .eq("id", tradeId)
      .single();

    if (fetchError || !trade) {
      return new Response(JSON.stringify({ error: "Trade not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user is part of the trade
    if (trade.buyer_id !== user.id && trade.seller_id !== user.id) {
      return new Response(JSON.stringify({ error: "Not authorized for this trade" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const updateData: any = {};

    if (action === "mark_shipped") {
      updateData.status = "shipped";
    } else if (action === "mark_received") {
      // Validate that seller marked as shipped first
      if (trade.status !== "shipped") {
        return new Response(JSON.stringify({ error: "Seller must mark item as shipped before buyer can confirm receipt" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate that only buyer can mark received
      if (user.id !== trade.buyer_id) {
        return new Response(JSON.stringify({ error: "Only the buyer can mark item as received" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      updateData.status = "completed";
      
      // Release escrow if enabled
      if (trade.escrow_enabled && !trade.escrow_released && trade.escrow_amount > 0) {
        updateData.escrow_released = true;
        updateData.escrow_released_at = new Date().toISOString();

        // Transfer funds from escrow to seller's wallet using service role key
        const supabaseAdmin = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        try {
          // Get or create seller wallet
          let { data: sellerWallet } = await supabaseAdmin
            .from("wallet_accounts")
            .select("*")
            .eq("user_id", trade.seller_id)
            .single();

          if (!sellerWallet) {
            const { data: newWallet, error: walletError } = await supabaseAdmin
              .from("wallet_accounts")
              .insert({ 
                user_id: trade.seller_id,
                balance: 0,
                pending_balance: 0,
                currency: "gbp"
              })
              .select()
              .single();
            
            if (walletError) throw walletError;
            sellerWallet = newWallet;
          }

          // Transfer escrow to seller's available balance
          const { error: balanceError } = await supabaseAdmin
            .from("wallet_accounts")
            .update({
              balance: Number(sellerWallet.balance) + Number(trade.escrow_amount),
              pending_balance: Math.max(0, Number(sellerWallet.pending_balance) - Number(trade.escrow_amount))
            })
            .eq("user_id", trade.seller_id);

          if (balanceError) throw balanceError;

          // Create transaction record
          const { error: txError } = await supabaseAdmin
            .from("wallet_transactions")
            .insert({
              wallet_id: sellerWallet.id,
              type: "escrow_release",
              amount: trade.escrow_amount,
              status: "completed",
              description: `Escrow release for trade ${tradeId}`
            });

          if (txError) throw txError;

          console.log(`✅ Released escrow of ${trade.escrow_amount} to seller ${trade.seller_id} for trade ${tradeId}`);
        } catch (escrowError) {
          console.error("❌ Escrow release error:", escrowError);
          return new Response(JSON.stringify({ error: "Failed to release escrow funds" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Update completion record
      const { error: completionError } = await supabaseClient
        .from("trade_completions")
        .insert({
          trade_offer_id: tradeId,
          buyer_received: true,
          seller_received: true,
          completed_at: new Date().toISOString(),
        });

      if (completionError) {
        console.error("Error creating completion record:", completionError);
      }

      // Calculate and update trade stats for both parties
      await calculateStats(supabaseClient, trade.buyer_id);
      await calculateStats(supabaseClient, trade.seller_id);

      // Award badges if applicable
      await checkAndAwardBadges(supabaseClient, trade.buyer_id);
      await checkAndAwardBadges(supabaseClient, trade.seller_id);
    }

    const { error: updateError } = await supabaseClient
      .from("trade_offers")
      .update(updateData)
      .eq("id", tradeId);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in trade-complete:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function calculateStats(supabase: any, userId: string) {
  const { data: trades } = await supabase
    .from("trade_offers")
    .select("*")
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);

  if (!trades) return;

  const completed = trades.filter((t: any) => t.status === "accepted").length;
  const total = trades.length;
  const avgFairness = trades
    .filter((t: any) => t.status === "accepted" && t.ai_fairness_score)
    .reduce((sum: number, t: any) => sum + (t.ai_fairness_score || 0), 0) / (completed || 1);

  await supabase.from("trade_stats").upsert({
    user_id: userId,
    total_trades_completed: completed,
    avg_fairness_accepted: avgFairness,
    trade_completion_rate: (completed / total) * 100,
    last_calculated_at: new Date().toISOString(),
  });
}

async function checkAndAwardBadges(supabase: any, userId: string) {
  const { data: stats } = await supabase
    .from("trade_stats")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!stats) return;

  const badges = [];

  // Fair Trader: >90% avg fairness
  if (stats.avg_fairness_accepted >= 90) {
    badges.push({ user_id: userId, badge_type: "fair_trader" });
  }

  // High Volume: 50+ completed trades
  if (stats.total_trades_completed >= 50) {
    badges.push({ user_id: userId, badge_type: "high_volume" });
  }

  for (const badge of badges) {
    await supabase
      .from("seller_badges")
      .upsert(badge, { onConflict: "user_id,badge_type" });
  }
}
