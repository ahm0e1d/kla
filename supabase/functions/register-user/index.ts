import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1457132689563062424/qfdrnt0rcubQqRzlkWjIvMNrj4pfPHf25Dk6Xz9_hh6ChXPe359iPFEpqu9D94Msrdgt";

interface RegisterRequest {
  email: string;
  password: string;
  discord_username: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email, password, discord_username }: RegisterRequest = await req.json();

    console.log("Registration attempt:", { email, discord_username });

    // Validate input
    if (!email || !password || !discord_username) {
      return new Response(
        JSON.stringify({ error: "جميع الحقول مطلوبة" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if discord username already exists in pending or approved users
    const { data: existingPending } = await supabase
      .from("pending_users")
      .select("id, status")
      .eq("discord_username", discord_username)
      .maybeSingle();

    if (existingPending && existingPending.status === "pending") {
      return new Response(
        JSON.stringify({ error: "يوزر Discord مسجل مسبقاً وينتظر التفعيل" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: existingApproved } = await supabase
      .from("approved_users")
      .select("id")
      .eq("discord_username", discord_username)
      .maybeSingle();

    if (existingApproved) {
      return new Response(
        JSON.stringify({ error: "يوزر Discord مسجل مسبقاً" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check email in pending
    const { data: existingEmailPending } = await supabase
      .from("pending_users")
      .select("id, status")
      .eq("email", email)
      .maybeSingle();

    if (existingEmailPending && existingEmailPending.status === "pending") {
      return new Response(
        JSON.stringify({ error: "الإيميل مسجل مسبقاً وينتظر التفعيل" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: existingEmailApproved } = await supabase
      .from("approved_users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingEmailApproved) {
      return new Response(
        JSON.stringify({ error: "الإيميل مسجل مسبقاً" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Simple password hash for shop login
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const passwordHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    // Clean up old rejected/deactivated records if re-registering
    if (existingPending && existingPending.status !== "pending") {
      // Delete old auth user if exists
      try {
        const { data: { users } } = await supabase.auth.admin.listUsers();
        const oldAuthUser = users?.find((u: any) => u.email === email);
        if (oldAuthUser) {
          await supabase.auth.admin.deleteUser(oldAuthUser.id);
        }
      } catch (e) { console.error("Cleanup auth error:", e); }
      await supabase.from("pending_users").delete().eq("id", existingPending.id);
    }
    if (existingEmailPending && existingEmailPending.status !== "pending" && existingEmailPending.id !== existingPending?.id) {
      try {
        const { data: { users } } = await supabase.auth.admin.listUsers();
        const oldAuthUser = users?.find((u: any) => u.email === email);
        if (oldAuthUser) {
          await supabase.auth.admin.deleteUser(oldAuthUser.id);
        }
      } catch (e) { console.error("Cleanup auth error:", e); }
      await supabase.from("pending_users").delete().eq("id", existingEmailPending.id);
    }

    // Create auth user first (for admin panel access later)
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        discord_username
      }
    });

    if (authError) {
      console.error("Auth user creation error:", authError);
      if (!authError.message.includes("already been registered")) {
        return new Response(
          JSON.stringify({ error: "حدث خطأ أثناء إنشاء الحساب" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const authUserId = authUser?.user?.id;

    // Insert pending user with auth user id if available
    const { data: newUser, error: insertError } = await supabase
      .from("pending_users")
      .insert({
        id: authUserId, // Use auth user id if available
        email,
        password_hash: passwordHash,
        discord_username,
        status: "pending"
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "حدث خطأ أثناء التسجيل" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("User registered:", newUser.id);

    // Send Discord notification
    try {
      const discordPayload = {
        embeds: [{
          title: "📝 طلب تسجيل جديد",
          color: 0xFFA500,
          fields: [
            { name: "🆔 ID التسجيل", value: newUser.id, inline: false },
            { name: "📧 الإيميل", value: email, inline: true },
            { name: "🎮 يوزر Discord", value: discord_username, inline: true },
            { name: "📅 التاريخ", value: new Date().toLocaleString("ar-SA"), inline: false }
          ],
          footer: { text: "Walker Family Shop - طلب تسجيل معلق" },
          timestamp: new Date().toISOString()
        }]
      };

      await fetch(DISCORD_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(discordPayload)
      });

      console.log("Discord notification sent");
    } catch (discordError) {
      console.error("Discord webhook error:", discordError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "تم التسجيل بنجاح! انتظر تفعيل حسابك من المالك" 
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
