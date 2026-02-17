import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1457132689563062424/qfdrnt0rcubQqRzlkWjIvMNrj4pfPHf25Dk6Xz9_hh6ChXPe359iPFEpqu9D94Msrdgt";

interface ApproveRequest {
  pending_user_id: string;
  action: "approve" | "reject";
  admin_email?: string;
  admin_discord?: string;
}

async function sendDiscordNotification(embed: object) {
  try {
    await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });
  } catch (error) {
    console.error("Failed to send Discord notification:", error);
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { pending_user_id, action, admin_email, admin_discord }: ApproveRequest = await req.json();

    console.log("Approval action:", { pending_user_id, action, admin_email, admin_discord });

    if (!pending_user_id || !action) {
      return new Response(
        JSON.stringify({ error: "البيانات غير مكتملة" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get pending user
    const { data: pendingUser, error: fetchError } = await supabase
      .from("pending_users")
      .select("*")
      .eq("id", pending_user_id)
      .eq("status", "pending")
      .maybeSingle();

    if (!pendingUser) {
      return new Response(
        JSON.stringify({ error: "المستخدم غير موجود أو تم معالجته مسبقاً" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "approve") {
      // Create approved user with the same ID as pending user (which is the auth user id)
      const { error: insertError } = await supabase
        .from("approved_users")
        .insert({
          id: pendingUser.id, // Use the same ID (auth user id)
          email: pendingUser.email,
          discord_username: pendingUser.discord_username,
          password_hash: pendingUser.password_hash,
          approved_by_email: admin_email || null,
          approved_by_discord: admin_discord || null
        });

      if (insertError) {
        console.error("Insert error:", insertError);
        return new Response(
          JSON.stringify({ error: "حدث خطأ أثناء تفعيل الحساب" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update pending user status
      await supabase
        .from("pending_users")
        .update({ 
          status: "approved",
          approved_at: new Date().toISOString()
        })
        .eq("id", pending_user_id);

      console.log("User approved:", pendingUser.discord_username);

      // Send Discord notification for approval
      const approveEmbed = {
        title: "✅ تم تفعيل حساب جديد",
        color: 0x00ff00,
        fields: [
          {
            name: "اسم المستخدم",
            value: pendingUser.discord_username,
            inline: true,
          },
          {
            name: "البريد الإلكتروني",
            value: pendingUser.email,
            inline: true,
          },
          {
            name: "تم بواسطة",
            value: admin_discord || admin_email || "غير معروف",
            inline: true,
          },
        ],
        timestamp: new Date().toISOString(),
      };
      await sendDiscordNotification(approveEmbed);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `تم تفعيل حساب ${pendingUser.discord_username}` 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (action === "reject") {
      // Just delete the pending user - don't move to blacklist
      // Only deactivation from approved users goes to blacklist
      await supabase
        .from("pending_users")
        .delete()
        .eq("id", pending_user_id);

      console.log("User rejected and removed:", pendingUser.discord_username);

      // Send Discord notification for rejection
      const rejectEmbed = {
        title: "❌ تم رفض طلب تسجيل",
        color: 0xff0000,
        fields: [
          {
            name: "اسم المستخدم",
            value: pendingUser.discord_username,
            inline: true,
          },
          {
            name: "البريد الإلكتروني",
            value: pendingUser.email,
            inline: true,
          },
          {
            name: "تم بواسطة",
            value: admin_discord || admin_email || "غير معروف",
            inline: true,
          },
        ],
        timestamp: new Date().toISOString(),
      };
      await sendDiscordNotification(rejectEmbed);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `تم رفض طلب ${pendingUser.discord_username}` 
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
