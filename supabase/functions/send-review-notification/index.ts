import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { reviewId, sellerId, listingTitle } = await req.json();

    console.log("📧 Sending review notification:", { reviewId, sellerId, listingTitle });

    // Get seller profile and preferences
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('email, full_name')
      .eq('id', sellerId)
      .single();

    const { data: preferences } = await supabaseClient
      .from('review_notification_preferences')
      .select('notify_new_review')
      .eq('user_id', sellerId)
      .single();

    if (!preferences?.notify_new_review) {
      console.log("⏭️ User has disabled review notifications");
      return new Response(
        JSON.stringify({ success: true, message: "Notifications disabled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!profile?.email) {
      throw new Error("Seller email not found");
    }

    // Send email via Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "Grail Central <reviews@6seven.io>",
      to: [profile.email],
      subject: `New Review Received for "${listingTitle}"`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">You've received a new review! ⭐</h2>
          <p style="color: #666; font-size: 16px;">
            Hi ${profile.full_name || 'there'},
          </p>
          <p style="color: #666; font-size: 16px;">
            A buyer just left a review for your listing: <strong>${listingTitle}</strong>
          </p>
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #666;">
              Check your dashboard to read the review and respond to build trust with potential buyers.
            </p>
          </div>
          <a href="${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovableproject.com')}/seller/reputation" 
             style="display: inline-block; background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            View Review
          </a>
          <p style="color: #999; font-size: 12px; margin-top: 40px;">
            To manage your notification preferences, visit your account settings.
          </p>
        </div>
      `,
    });

    if (emailError) {
      console.error("❌ Resend API Error:", emailError);
      throw new Error(`Failed to send email: ${emailError.message}`);
    }

    console.log("✅ Review notification sent:", {
      emailId: emailData?.id,
      to: profile.email,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Review notification sent",
        emailId: emailData?.id
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-review-notification:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});