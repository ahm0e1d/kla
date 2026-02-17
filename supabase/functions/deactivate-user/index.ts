import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1457142729673932972/HIrz3mpXm177kDBDKxF1KuvG22PVZH8S1SCKxh9ThYqel3Ou1-dHmofN2oknvkMw7gII";

interface DeactivateRequest {
  user_id: string;
  reason: string;
  admin_email?: string;
  admin_discord?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, reason, admin_email, admin_discord }: DeactivateRequest = await req.json();

    console.log("Deactivate user request:", { user_id, reason, admin_email, admin_discord });

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "معرف المستخدم مطلوب" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!reason || !reason.trim()) {
      return new Response(
        JSON.stringify({ error: "السبب مطلوب" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the user info before deleting
    const { data: approvedUser, error: fetchError } = await supabase
      .from("approved_users")
      .select("*")
      .eq("id", user_id)
      .maybeSingle();

    if (fetchError || !approvedUser) {
      console.error("Fetch error:", fetchError);
      return new Response(
        JSON.stringify({ error: "المستخدم غير موجود" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete from approved_users
    const { error: deleteError } = await supabase
      .from("approved_users")
      .delete()
      .eq("id", user_id);

    if (deleteError) {
      console.error("Delete error:", deleteError);
      return new Response(
        JSON.stringify({ error: "حدث خطأ أثناء إلغاء التفعيل" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Also remove admin role if exists
    await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", user_id);

    // Add to pending_users with rejected status and reason (upsert to handle existing records)
    const { error: upsertError } = await supabase
      .from("pending_users")
      .upsert({
        email: approvedUser.email,
        discord_username: approvedUser.discord_username,
        password_hash: approvedUser.password_hash,
        status: "rejected",
        deactivation_reason: reason,
        deactivated_by_email: admin_email || null,
        deactivated_by_discord: admin_discord || null,
      }, { onConflict: 'email' });

    if (upsertError) {
      console.error("Upsert to pending_users error:", upsertError);
    }

    console.log("User deactivated:", approvedUser.discord_username);

    // Send Discord webhook
    try {
      const embed = {
        title: "🚫 تم سحب تفعيل مستخدم",
        color: 15158332, // Red color
        fields: [
          {
            name: "ID المستخدم",
            value: user_id,
            inline: true,
          },
          {
            name: "اسم الديسكورد",
            value: approvedUser.discord_username,
            inline: true,
          },
          {
            name: "البريد الإلكتروني",
            value: approvedUser.email,
            inline: true,
          },
          {
            name: "السبب",
            value: reason,
            inline: false,
          },
          {
            name: "تم بواسطة",
            value: admin_discord || admin_email || "غير معروف",
            inline: true,
          },
        ],
        timestamp: new Date().toISOString(),
      };

      await fetch(DISCORD_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embeds: [embed] }),
      });

      console.log("Discord webhook sent for deactivation");
    } catch (webhookError) {
      console.error("Failed to send Discord webhook:", webhookError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `تم إلغاء تفعيل ${approvedUser.discord_username}` 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "حدث خطأ غير متوقع" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
