import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DISCORD_REGISTRATION_WEBHOOK = "https://discord.com/api/webhooks/1457132689563062424/qfdrnt0rcubQqRzlkWjIvMNrj4pfPHf25Dk6Xz9_hh6ChXPe359iPFEpqu9D94Msrdgt";

interface ProcessRequest {
  applicationId: string;
  action: "accept" | "reject";
  roleId?: string;
  adminEmail: string;
  adminDiscord?: string;
}

// Simple hash function for password
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { applicationId, action, roleId, adminEmail, adminDiscord }: ProcessRequest = await req.json();

    console.log("Processing job application:", { applicationId, action, roleId });

    // Fetch the application
    const { data: application, error: fetchError } = await supabase
      .from("job_applications")
      .select("*")
      .eq("id", applicationId)
      .eq("status", "pending")
      .maybeSingle();

    if (fetchError || !application) {
      return new Response(
        JSON.stringify({ error: "الطلب غير موجود أو تم معالجته مسبقاً" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "accept") {
      if (!roleId) {
        return new Response(
          JSON.stringify({ error: "يجب تحديد الرول" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Look up the applicant's existing account by discord_username in pending_users
      const { data: pendingUser } = await supabase
        .from("pending_users")
        .select("*")
        .eq("discord_username", application.discord_username)
        .maybeSingle();

      // Also check approved_users
      const { data: existingApproved } = await supabase
        .from("approved_users")
        .select("*")
        .eq("discord_username", application.discord_username)
        .maybeSingle();

      let userId: string;
      let email: string;
      let password: string;

      if (existingApproved) {
        // User already has an approved account - just assign the role
        userId = existingApproved.id;
        email = existingApproved.email;
        password = "(نفس كلمة السر الحالية)";
      } else if (pendingUser && pendingUser.status === "pending") {
        // User registered on the site and is pending approval
        userId = pendingUser.id;
        email = pendingUser.email;
        password = "(نفس كلمة السر المسجلة)";

        const { error: approvedError } = await supabase
          .from("approved_users")
          .insert({
            id: userId,
            email,
            discord_username: application.discord_username,
            password_hash: pendingUser.password_hash,
            approved_by_email: adminEmail,
            approved_by_discord: adminDiscord,
          });

        if (approvedError) {
          console.error("Approved user error:", approvedError);
          return new Response(
            JSON.stringify({ error: "خطأ في إنشاء سجل المستخدم" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        await supabase
          .from("pending_users")
          .update({ status: "approved", approved_at: new Date().toISOString() })
          .eq("id", userId);
      } else {
        // New user OR previously rejected/deactivated - clean up old records and create fresh
        if (pendingUser) {
          // Clean up old pending record
          console.log("Cleaning up old rejected/deactivated pending user:", pendingUser.id);
          // Try to delete old auth user if exists
          try {
            const { data: { users } } = await supabase.auth.admin.listUsers();
            const oldAuthUser = users?.find(u => u.email === pendingUser.email);
            if (oldAuthUser) {
              console.log("Deleting old auth user:", oldAuthUser.id);
              await supabase.auth.admin.deleteUser(oldAuthUser.id);
            }
          } catch (e) {
            console.error("Error cleaning up old auth user:", e);
          }
          // Delete old pending record
          await supabase.from("pending_users").delete().eq("id", pendingUser.id);
        }

        // Create completely new account
        email = `${application.discord_username.replace(/[^a-zA-Z0-9]/g, "")}@walkerfamily.shop`;
        password = application.account_name;
        const hashedPassword = await hashPassword(password);

        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });

        if (authError) {
          console.error("Auth error:", authError);
          return new Response(
            JSON.stringify({ error: "خطأ في إنشاء حساب المستخدم" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        userId = authUser.user.id;

        const { error: approvedError } = await supabase
          .from("approved_users")
          .insert({
            id: userId,
            email,
            discord_username: application.discord_username,
            password_hash: hashedPassword,
            approved_by_email: adminEmail,
            approved_by_discord: adminDiscord,
          });

        if (approvedError) {
          console.error("Approved user error:", approvedError);
          await supabase.auth.admin.deleteUser(userId);
          return new Response(
            JSON.stringify({ error: "خطأ في إنشاء سجل المستخدم" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Assign role to user
      const { error: roleError } = await supabase
        .from("user_custom_roles")
        .insert({
          user_id: userId!,
          role_id: roleId,
          assigned_by: adminEmail,
        });

      if (roleError) {
        console.error("Role assignment error:", roleError);
      }

      // Get role name for webhook
      const { data: roleData } = await supabase
        .from("custom_roles")
        .select("name")
        .eq("id", roleId)
        .maybeSingle();

      // Update application status
      await supabase
        .from("job_applications")
        .update({
          status: "accepted",
          handled_by_email: adminEmail,
          handled_by_discord: adminDiscord,
          assigned_role_id: roleId,
          processed_at: new Date().toISOString(),
        })
        .eq("id", applicationId);

      // Send Discord webhook
      const embed = {
        title: "✅ تم قبول طلب توظيف",
        color: 0x22c55e,
        fields: [
          { name: "اسم الحساب", value: application.account_name, inline: true },
          { name: "اسم الشخصية", value: application.character_name, inline: true },
          { name: "يوزر الديسكورد", value: application.discord_username, inline: true },
          { name: "الرول", value: roleData?.name || "غير محدد", inline: true },
          { name: "الايميل", value: email, inline: true },
          { name: "بواسطة", value: adminDiscord || adminEmail, inline: true },
        ],
        timestamp: new Date().toISOString(),
        footer: { text: "Walker Family Shop" },
      };

      await fetch(DISCORD_REGISTRATION_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embeds: [embed] }),
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `تم قبول ${application.discord_username}`,
          email,
          password: existingApproved ? undefined : password,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "إجراء غير صالح" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "حدث خطأ غير متوقع" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
