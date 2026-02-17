import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1457142786498236522/ipk_45BtgnxJc1p3UYx3FnoOE6LTbKVyjTaWJhJOZWCnNo7o3G5erqsESH0wGRiqvOmc";
const DISCORD_DEACTIVATION_WEBHOOK_URL = "https://discord.com/api/webhooks/1457142729673932972/HIrz3mpXm177kDBDKxF1KuvG22PVZH8S1SCKxh9ThYqel3Ou1-dHmofN2oknvkMw7gII";

interface ManageAdminRequest {
  approved_user_id: string;
  action: "add" | "remove";
  admin_email?: string;
  admin_discord?: string;
  removal_reason?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { approved_user_id, action, admin_email, admin_discord, removal_reason }: ManageAdminRequest = await req.json();

    console.log("Manage admin request:", { approved_user_id, action, admin_email, admin_discord, removal_reason });

    if (!approved_user_id || !action) {
      return new Response(
        JSON.stringify({ error: "البيانات غير مكتملة" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the approved user info
    const { data: approvedUser, error: fetchError } = await supabase
      .from("approved_users")
      .select("*")
      .eq("id", approved_user_id)
      .maybeSingle();

    if (fetchError || !approvedUser) {
      console.error("Fetch error:", fetchError);
      return new Response(
        JSON.stringify({ error: "المستخدم غير موجود" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "add") {
      // Check if already admin
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", approved_user_id)
        .eq("role", "admin")
        .maybeSingle();

      if (existingRole) {
        return new Response(
          JSON.stringify({ error: "هذا المستخدم أدمن بالفعل" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Add admin role (user already has auth account from registration)
      const { error: insertError } = await supabase
        .from("user_roles")
        .insert({
          user_id: approved_user_id,
          role: "admin",
          added_by_email: admin_email || null,
          added_by_discord: admin_discord || null
        });

      if (insertError) {
        console.error("Insert error:", insertError);
        return new Response(
          JSON.stringify({ error: "حدث خطأ أثناء إضافة صلاحية الأدمن" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Admin role added for:", approvedUser.discord_username);

      // Send Discord webhook
      try {
        const embed = {
          title: "🛡️ تم ترقية مستخدم لأدمن",
          color: 3066993, // Green color
          fields: [
            {
              name: "ID المستخدم",
              value: approved_user_id,
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
          ],
          timestamp: new Date().toISOString(),
        };

        await fetch(DISCORD_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ embeds: [embed] }),
        });

        console.log("Discord webhook sent for admin promotion");
      } catch (webhookError) {
        console.error("Failed to send Discord webhook:", webhookError);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `تم منح صلاحية الأدمن لـ ${approvedUser.discord_username}` 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (action === "remove") {
      // Check if reason is provided
      if (!removal_reason || !removal_reason.trim()) {
        return new Response(
          JSON.stringify({ error: "سبب سحب الأدمنية مطلوب" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update admin role with removal info instead of deleting
      const { error: updateError } = await supabase
        .from("user_roles")
        .update({
          removed_at: new Date().toISOString(),
          removed_by_email: admin_email || null,
          removed_by_discord: admin_discord || null,
          removal_reason: removal_reason
        })
        .eq("user_id", approved_user_id)
        .eq("role", "admin");

      if (updateError) {
        console.error("Update error:", updateError);
        return new Response(
          JSON.stringify({ error: "حدث خطأ أثناء إزالة صلاحية الأدمن" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Admin role removed for:", approvedUser.discord_username);

      // Send Discord webhook
      try {
        const embed = {
          title: "⬇️ تم إزالة صلاحية الأدمن",
          color: 15105570, // Orange color
          fields: [
            {
              name: "ID المستخدم",
              value: approved_user_id,
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
              value: removal_reason,
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

        // Send to deactivation webhook (same as user deactivation)
        await fetch(DISCORD_DEACTIVATION_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ embeds: [embed] }),
        });

        console.log("Discord webhook sent for admin demotion");
      } catch (webhookError) {
        console.error("Failed to send Discord webhook:", webhookError);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `تم إزالة صلاحية الأدمن من ${approvedUser.discord_username}` 
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
