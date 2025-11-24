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
      from: "Grail Central <noreply@6seven.io>",
      to: [testEmail],
      subject: "🧪 TEST: Email Verification System",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #ff4444; color: white; padding: 15px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">⚠️ TEST EMAIL ⚠️</h1>
            <p style="margin: 10px 0 0 0; font-size: 14px;">This is a test of the email verification system</p>
          </div>
          
          <div style="padding: 30px; background-color: #f9f9f9; border-radius: 0 0 8px 8px;">
            <h2 style="color: #333; margin-top: 0;">Email System Test Successful! ✅</h2>
            <p style="color: #666; font-size: 16px;">
              If you're seeing this email, it means your email system is properly configured and working.
            </p>
            
            <div style="background-color: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #4CAF50;">
              <h3 style="color: #333; margin-top: 0;">Test Details:</h3>
              <p style="margin: 5px 0; color: #666;"><strong>To:</strong> ${testEmail}</p>
              <p style="margin: 5px 0; color: #666;"><strong>From:</strong> noreply@6seven.io</p>
              <p style="margin: 5px 0; color: #666;"><strong>Domain:</strong> 6seven.io (Verified ✓)</p>
              <p style="margin: 5px 0; color: #666;"><strong>Magic Link:</strong> <a href="${linkData.properties.action_link}" style="color: #1976d2;">Click to Test</a></p>
              <p style="margin: 5px 0; color: #666;"><strong>Test Date:</strong> ${new Date().toLocaleString()}</p>
            </div>
            
            <div style="background-color: #e3f2fd; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0; color: #1976d2; font-size: 14px;">
                <strong>📝 Note:</strong> This is a test email sent from the admin dashboard. 
                Real verification emails will have the same styling but without the red warning banner.
              </p>
            </div>
            
            <p style="color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              This test email was sent by an administrator to verify the email delivery system is working correctly.
            </p>
          </div>
        </div>
      `,
    });

    if (emailError) {
      console.error("❌ Resend API Error:", {
        error: emailError,
        message: emailError.message,
        name: emailError.name || 'Unknown',
        to: testEmail
      });
      throw new Error(`Failed to send test email: ${emailError.message}`);
    }

    console.log("✅ Test email sent successfully:", {
      emailId: emailData?.id,
      to: testEmail,
      from: "noreply@6seven.io"
    });

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
