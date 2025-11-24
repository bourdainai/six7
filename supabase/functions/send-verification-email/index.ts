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

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already verified
    if (user.email_confirmed_at) {
      return new Response(
        JSON.stringify({ success: true, message: "Email already verified" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("📧 Generating verification link for user:", user.email);
    
    // Generate verification link using Supabase Admin API
    const { data: linkData, error: linkError } = await supabaseClient.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email!,
    });

    if (linkError || !linkData) {
      console.error("❌ Error generating verification link:", linkError);
      throw new Error("Failed to generate verification link");
    }

    console.log("✅ Verification link generated");

    // Send email via Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "Grail Central <noreply@6seven.io>",
      to: [user.email!],
      subject: "Verify your email address",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Verify Your Email</h2>
          <p>Thanks for signing up! Please verify your email address by clicking the button below:</p>
          <a href="${linkData.properties.action_link}" 
             style="display: inline-block; background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            Verify Email
          </a>
          <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
          <p style="color: #666; font-size: 12px; word-break: break-all;">${linkData.properties.action_link}</p>
          <p style="color: #999; font-size: 12px; margin-top: 40px;">If you didn't sign up for this account, you can safely ignore this email.</p>
        </div>
      `,
    });

    if (emailError) {
      console.error("❌ Resend API Error:", {
        error: emailError,
        message: emailError.message,
        name: emailError.name || 'Unknown',
        to: user.email
      });
      throw new Error(`Failed to send verification email: ${emailError.message}`);
    }

    console.log("✅ Verification email sent successfully:", {
      emailId: emailData?.id,
      to: user.email,
      from: "noreply@6seven.io"
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Verification email sent successfully. Please check your inbox at " + user.email 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-verification-email:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
