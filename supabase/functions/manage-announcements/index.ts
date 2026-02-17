import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DISCORD_ANNOUNCEMENTS_WEBHOOK = "https://discord.com/api/webhooks/1471047184291201116/pp-hJbKvUZMaDkFONuoNwRIP-maz2lzwI2VbtEmjJheYlYJEyaY5tsmJ4THId_iSERzN";

const ANNOUNCEMENT_TYPE_CONFIG: Record<string, { emoji: string; color: number }> = {
  info: { emoji: "ℹ️", color: 0x3b82f6 },
  success: { emoji: "✅", color: 0x22c55e },
  warning: { emoji: "⚠️", color: 0xf59e0b },
  error: { emoji: "🚨", color: 0xef4444 },
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnnouncementRequest {
  action: "list" | "create" | "update" | "delete";
  id?: string;
  title?: string;
  content?: string;
  type?: string;
  is_active?: boolean;
  expires_at?: string | null;
  admin_email?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: AnnouncementRequest = await req.json();
    const { action, id, title, content, type, is_active, expires_at, admin_email } = body;

    if (action === "list") {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, announcements: data }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "create" && title && content) {
      const { data, error } = await supabase
        .from("announcements")
        .insert({
          title,
          content,
          type: type || "info",
          is_active: is_active !== false,
          expires_at: expires_at || null,
          created_by: admin_email || "unknown"
        })
        .select()
        .single();

      if (error) throw error;

      // Send to Discord webhook
      try {
        const typeConfig = ANNOUNCEMENT_TYPE_CONFIG[type || "info"] || ANNOUNCEMENT_TYPE_CONFIG.info;
        const embed = {
          title: `${typeConfig.emoji} ${title}`,
          description: content,
          color: typeConfig.color,
          fields: [
            { name: "📋 النوع", value: type || "info", inline: true },
            { name: "👤 بواسطة", value: admin_email || "غير محدد", inline: true },
          ],
          timestamp: new Date().toISOString(),
          footer: { text: "Walker Family Shop - إعلان" },
        };

        await fetch(DISCORD_ANNOUNCEMENTS_WEBHOOK, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ embeds: [embed] }),
        });
      } catch (webhookError) {
        console.error("Discord webhook error:", webhookError);
      }

      return new Response(
        JSON.stringify({ success: true, announcement: data }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "update" && id) {
      const updates: Record<string, unknown> = {};
      if (title !== undefined) updates.title = title;
      if (content !== undefined) updates.content = content;
      if (type !== undefined) updates.type = type;
      if (is_active !== undefined) updates.is_active = is_active;
      if (expires_at !== undefined) updates.expires_at = expires_at;

      const { error } = await supabase
        .from("announcements")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "delete" && id) {
      const { error } = await supabase
        .from("announcements")
        .delete()
        .eq("id", id);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action or missing parameters" }),
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
