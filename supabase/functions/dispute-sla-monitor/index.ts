import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// SLA Thresholds (in hours)
const SLA_THRESHOLDS = {
  RESPONSE: 24,      // Admin must respond within 24 hours
  RESOLUTION: 72,    // Must resolve within 72 hours
  CRITICAL: 96,      // Critical escalation after 96 hours
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log("🔍 Running SLA monitor...");

    const now = new Date();
    
    // Get all open disputes
    const { data: disputes, error: disputeError } = await supabaseAdmin
      .from('disputes')
      .select(`
        *,
        order:orders!disputes_order_id_fkey(id, total_amount),
        buyer:profiles!disputes_buyer_id_fkey(email, full_name),
        seller:profiles!disputes_seller_id_fkey(email, full_name)
      `)
      .in('status', ['open', 'in_review']);

    if (disputeError) throw disputeError;

    let escalated = 0;
    let critical = 0;
    let breachedResponse = 0;

    for (const dispute of disputes || []) {
      const createdAt = new Date(dispute.created_at);
      const hoursSinceCreated = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

      let priority = 'low_priority';
      let shouldNotify = false;

      // Check SLA breaches
      if (hoursSinceCreated > SLA_THRESHOLDS.CRITICAL) {
        priority = 'critical';
        critical++;
        shouldNotify = true;
      } else if (hoursSinceCreated > SLA_THRESHOLDS.RESOLUTION) {
        priority = 'high_priority';
        escalated++;
        shouldNotify = true;
      } else if (hoursSinceCreated > SLA_THRESHOLDS.RESPONSE) {
        priority = 'medium_priority';
        breachedResponse++;
      }

      // Update moderation queue with priority
      const { error: queueError } = await supabaseAdmin
        .from('moderation_queue')
        .upsert({
          item_id: dispute.id,
          item_type: 'dispute',
          ai_classification: priority,
          ai_reason: `SLA Monitor: ${hoursSinceCreated.toFixed(1)} hours old`,
          status: dispute.status === 'open' ? 'pending' : 'in_review',
          updated_at: now.toISOString(),
        }, {
          onConflict: 'item_id,item_type',
        });

      if (queueError && !queueError.message.includes('duplicate')) {
        console.error(`Error updating queue for dispute ${dispute.id}:`, queueError);
      }

      // Send escalation notifications for critical/high priority
      if (shouldNotify && hoursSinceCreated > SLA_THRESHOLDS.RESOLUTION) {
        try {
          // Get all admins
          const { data: adminRoles } = await supabaseAdmin
            .from('user_roles')
            .select('user_id')
            .eq('role', 'admin');

          // Notify each admin
          for (const adminRole of adminRoles || []) {
            await supabaseAdmin.functions.invoke("send-email-notification", {
              body: {
                userId: adminRole.user_id,
                type: "dispute_created",
                subject: `⚠️ ${priority === 'critical' ? 'CRITICAL' : 'HIGH PRIORITY'} Dispute Escalation`,
                template: "dispute_created",
                data: {
                  action: "escalated",
                  orderId: dispute.order_id,
                  reason: `Dispute #${dispute.id.slice(0, 8)} has been open for ${hoursSinceCreated.toFixed(1)} hours (SLA: ${SLA_THRESHOLDS.RESOLUTION}h)`,
                  disputeLink: `${Deno.env.get('SITE_URL') || 'https://6seven.io'}/admin/disputes`,
                },
              },
            });
          }

          console.log(`📧 Escalation notifications sent for dispute ${dispute.id}`);
        } catch (emailError) {
          console.error('Error sending escalation emails:', emailError);
        }
      }
    }

    console.log(`✅ SLA Monitor Complete:`);
    console.log(`  - Total disputes checked: ${disputes?.length || 0}`);
    console.log(`  - Response SLA breached: ${breachedResponse}`);
    console.log(`  - Escalated (>72h): ${escalated}`);
    console.log(`  - Critical (>96h): ${critical}`);

    return new Response(
      JSON.stringify({
        success: true,
        stats: {
          total: disputes?.length || 0,
          breachedResponse,
          escalated,
          critical,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in dispute-sla-monitor:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});