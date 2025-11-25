import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface EmailNotificationRequest {
  userId: string;
  type: 'order_confirmation' | 'payment_received' | 'shipping_update' | 'new_message' | 
        'price_drop' | 'offer_update' | 'review_request' | 'order_delivered' | 
        'payout_completed' | 'listing_published' | 'dispute_created' | 'account_verification';
  subject: string;
  template: string;
  data?: Record<string, any>;
}

// Email templates
const emailTemplates: Record<string, (data: any) => string> = {
  order_confirmation: (data) => `
    <h2>Order Confirmation</h2>
    <p>Thank you for your purchase!</p>
    <p><strong>Order ID:</strong> ${data.orderId}</p>
    <p><strong>Item:</strong> ${data.itemName}</p>
    <p><strong>Total:</strong> £${data.total}</p>
    <p>You can track your order in your account.</p>
    <p><a href="${data.orderLink}">View Order</a></p>
  `,
  payment_received: (data) => `
    <h2>Payment Received</h2>
    <p>Great news! You've received a payment.</p>
    <p><strong>Amount:</strong> £${data.amount}</p>
    <p><strong>From Order:</strong> ${data.orderId}</p>
    <p>Your payout will be processed once the buyer confirms delivery.</p>
    <p><a href="${data.payoutLink}">View Payout Details</a></p>
  `,
  shipping_update: (data) => `
    <h2>Shipping Update</h2>
    <p>Your order has been shipped!</p>
    <p><strong>Order ID:</strong> ${data.orderId}</p>
    <p><strong>Tracking Number:</strong> ${data.trackingNumber}</p>
    <p><strong>Carrier:</strong> ${data.carrier}</p>
    <p>You can track your package using the tracking number above.</p>
    <p><a href="${data.trackingLink}">Track Package</a></p>
  `,
  new_message: (data) => `
    <h2>New Message</h2>
    <p>You have a new message from ${data.senderName}.</p>
    <p><strong>Subject:</strong> ${data.subject || 'No subject'}</p>
    <p><a href="${data.messageLink}">View Message</a></p>
  `,
  price_drop: (data) => `
    <h2>Price Drop Alert</h2>
    <p>The price has dropped on an item you're interested in!</p>
    <p><strong>Item:</strong> ${data.itemName}</p>
    <p><strong>Old Price:</strong> £${data.oldPrice}</p>
    <p><strong>New Price:</strong> £${data.newPrice}</p>
    <p><strong>Savings:</strong> £${data.savings}</p>
    <p><a href="${data.itemLink}">View Item</a></p>
  `,
  offer_update: (data) => `
    <h2>Offer Update</h2>
    <p>Your offer has been ${data.status}.</p>
    <p><strong>Item:</strong> ${data.itemName}</p>
    <p><strong>Offer Amount:</strong> £${data.amount}</p>
    ${data.status === 'accepted' ? '<p>Complete your purchase now!</p>' : ''}
    <p><a href="${data.offerLink}">View Offer</a></p>
  `,
  review_request: (data) => `
    <h2>How was your purchase?</h2>
    <p>We'd love to hear about your experience!</p>
    <p><strong>Item:</strong> ${data.itemName}</p>
    <p>Please take a moment to leave a review for ${data.sellerName}.</p>
    <p><a href="${data.reviewLink}">Leave Review</a></p>
  `,
  order_delivered: (data) => `
    <h2>Order Delivered</h2>
    <p>Your order has been delivered!</p>
    <p><strong>Order ID:</strong> ${data.orderId}</p>
    <p><strong>Item:</strong> ${data.itemName}</p>
    <p>Please confirm delivery and leave a review if you're satisfied.</p>
    <p><a href="${data.orderLink}">View Order</a></p>
  `,
  payout_completed: (data) => `
    <h2>Payout Completed</h2>
    <p>Your payout has been processed successfully.</p>
    <p><strong>Amount:</strong> £${data.amount}</p>
    <p><strong>Transfer ID:</strong> ${data.transferId}</p>
    <p>The funds should appear in your bank account within 1-3 business days.</p>
    <p><a href="${data.payoutLink}">View Payout History</a></p>
  `,
  listing_published: (data) => `
    <h2>Your Listing is Live!</h2>
    <p>Congratulations! Your listing has been published.</p>
    <p><strong>Item:</strong> ${data.itemName}</p>
    <p>Your item is now visible to buyers. Share it to get more views!</p>
    <p><a href="${data.listingLink}">View Listing</a></p>
  `,
  dispute_created: (data) => `
    <h2>Dispute Created</h2>
    <p>A dispute has been ${data.action} for your order.</p>
    <p><strong>Order ID:</strong> ${data.orderId}</p>
    <p><strong>Reason:</strong> ${data.reason}</p>
    <p>Our team will review the dispute and get back to you soon.</p>
    <p><a href="${data.disputeLink}">View Dispute</a></p>
  `,
  account_verification: (data) => `
    <h2>Verify Your Email</h2>
    <p>Please verify your email address to complete your account setup.</p>
    <p>Click the link below to verify your email:</p>
    <p><a href="${data.verificationLink}">Verify Email</a></p>
    <p>If you didn't create an account, you can safely ignore this email.</p>
  `,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { userId, type, subject, template, data = {} }: EmailNotificationRequest = await req.json();

    if (!userId || !type || !subject) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user email and preferences
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("email, notification_preferences")
      .eq("id", userId)
      .single();

    if (profileError || !profile?.email) {
      return new Response(
        JSON.stringify({ error: "User not found or email not available" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check notification preferences
    const preferences = profile.notification_preferences || {};
    const emailEnabled = preferences.email_enabled !== false; // Default to true
    const typeEnabled = preferences[`email_${type}`] !== false; // Default to true

    if (!emailEnabled || !typeEnabled) {
      return new Response(
        JSON.stringify({ success: true, message: "Email notifications disabled for this type" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get email template
    const emailBody = emailTemplates[template] 
      ? emailTemplates[template](data)
      : emailTemplates[type]?.(data) || `<p>${data.message || 'You have a new notification.'}</p>`;

    // Send email via Resend
    const emailResult = await resend.emails.send({
      from: "6seven.io <noreply@6seven.io>",
      to: [profile.email],
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          ${emailBody}
          <hr style="border: none; border-top: 1px solid #ddd; margin: 40px 0 20px;" />
          <p style="color: #999; font-size: 12px; text-align: center;">
            6seven.io - The Trading Card Marketplace
          </p>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResult);

    // Create in-app notification
    await supabaseClient
      .from("notifications")
      .insert({
        user_id: userId,
        type: type.replace('_', '_') as any,
        title: subject,
        message: emailBody.replace(/<[^>]*>/g, '').substring(0, 200),
        link: data.link || null,
        metadata: data,
        read: false,
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email notification queued successfully" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-email-notification:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
