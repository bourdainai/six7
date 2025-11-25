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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user is admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin
    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roles) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { testEmail } = await req.json();
    
    if (!testEmail) {
      return new Response(
        JSON.stringify({ error: "Email address required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("📧 [ADMIN TEST] Generating verification link for:", testEmail);
    
    // Generate verification link using Supabase Admin API
    const { data: linkData, error: linkError } = await supabaseClient.auth.admin.generateLink({
      type: 'magiclink',
      email: testEmail,
    });

    if (linkError || !linkData) {
      console.error("❌ Error generating verification link:", linkError);
      throw new Error("Failed to generate verification link");
    }

    console.log("✅ Verification link generated");

    // Send test email via Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "Grail Central <noreply@grailcentral.com>",
      to: [testEmail],
      subject: "[TEST] Verify your email address",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 3px solid #ff0000; padding: 20px;">
          <div style="background: #ff0000; color: white; padding: 10px; margin: -20px -20px 20px -20px; font-weight: bold;">
            ⚠️ ADMIN TEST EMAIL - NOT FOR PRODUCTION USE
          </div>
          <h2 style="color: #333;">Verify Your Email</h2>
          <p>This is a <strong>TEST EMAIL</strong> sent by an administrator.</p>
          <p>Please verify your email address by clicking the button below:</p>
          <a href="${linkData.properties.action_link}" 
             style="display: inline-block; background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            Verify Email
          </a>
          <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
          <p style="color: #666; font-size: 12px; word-break: break-all;">${linkData.properties.action_link}</p>
          <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 10px; margin-top: 20px; border-radius: 4px;">
            <strong>Note:</strong> This is a test email sent from the admin dashboard for verification testing purposes only.
          </div>
        </div>
      `,
    });

    if (emailError) {
      console.error("❌ Error sending email:", emailError);
      throw new Error("Failed to send verification email");
    }

    console.log("✅ Test verification email sent successfully:", emailData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Test verification email sent to ${testEmail}`,
        emailId: emailData?.id
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in admin-send-test-email:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
