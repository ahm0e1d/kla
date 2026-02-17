import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const BOT_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN")!;
  const APP_ID = Deno.env.get("DISCORD_APP_ID")!;
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

  const commands = [
    {
      name: "activate",
      description: "تفعيل حساب مستخدم معلق",
      options: [
        { name: "discord_username", description: "يوزر الديسكورد", type: 3, required: true },
      ],
    },
    {
      name: "deactivate",
      description: "سحب تفعيل مستخدم",
      options: [
        { name: "discord_username", description: "يوزر الديسكورد", type: 3, required: true },
        { name: "reason", description: "سبب السحب", type: 3, required: true },
      ],
    },
    {
      name: "accept-recruit",
      description: "قبول طلب توظيف",
      options: [
        { name: "discord_username", description: "يوزر الديسكورد", type: 3, required: true },
        { name: "role", description: "اسم الرتبة", type: 3, required: true },
      ],
    },
    {
      name: "reject-recruit",
      description: "رفض طلب توظيف",
      options: [
        { name: "discord_username", description: "يوزر الديسكورد", type: 3, required: true },
        { name: "reason", description: "سبب الرفض", type: 3, required: true },
      ],
    },
    {
      name: "dismiss",
      description: "فصل بائع وسحب رتبته",
      options: [
        { name: "discord_username", description: "يوزر الديسكورد", type: 3, required: true },
        { name: "reason", description: "سبب الفصل", type: 3, required: true },
      ],
    },
    {
      name: "reset-stats",
      description: "تصفير إحصائيات بائع",
      options: [
        { name: "discord_username", description: "يوزر الديسكورد", type: 3, required: true },
      ],
    },
    {
      name: "reset-password",
      description: "تغيير كلمة سر مستخدم",
      options: [
        { name: "discord_username", description: "يوزر الديسكورد", type: 3, required: true },
        { name: "new_password", description: "كلمة السر الجديدة", type: 3, required: true },
      ],
    },
  ];

  try {
    // Register global commands
    const res = await fetch(`https://discord.com/api/v10/applications/${APP_ID}/commands`, {
      method: "PUT",
      headers: {
        Authorization: `Bot ${BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commands),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Failed to register commands:", data);
      return new Response(JSON.stringify({ error: "فشل تسجيل الأوامر", details: data }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Set interaction endpoint URL
    const interactionUrl = `${SUPABASE_URL}/functions/v1/discord-bot`;
    const updateRes = await fetch(`https://discord.com/api/v10/applications/${APP_ID}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bot ${BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ interactions_endpoint_url: interactionUrl }),
    });

    const updateData = await updateRes.json();

    if (!updateRes.ok) {
      console.error("Failed to set interaction URL:", updateData);
      return new Response(JSON.stringify({
        success: true,
        commands_registered: data.length || commands.length,
        interaction_url_error: updateData,
        manual_url: interactionUrl,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      success: true,
      commands_registered: data.length || commands.length,
      interaction_url: interactionUrl,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
