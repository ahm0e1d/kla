import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Discord interaction types
const INTERACTION_TYPE = { PING: 1, APPLICATION_COMMAND: 2 };
const INTERACTION_RESPONSE_TYPE = { PONG: 1, CHANNEL_MESSAGE: 4, DEFERRED_CHANNEL_MESSAGE: 5 };

const DISCORD_REGISTRATION_WEBHOOK = "https://discord.com/api/webhooks/1457132689563062424/qfdrnt0rcubQqRzlkWjIvMNrj4pfPHf25Dk6Xz9_hh6ChXPe359iPFEpqu9D94Msrdgt";

// Verify Discord signature
async function verifyDiscordSignature(req: Request, body: string): Promise<boolean> {
  const PUBLIC_KEY = Deno.env.get("DISCORD_APP_PUBLIC_KEY")!;
  const signature = req.headers.get("X-Signature-Ed25519");
  const timestamp = req.headers.get("X-Signature-Timestamp");

  if (!signature || !timestamp) return false;

  const encoder = new TextEncoder();
  const message = encoder.encode(timestamp + body);

  const keyBytes = new Uint8Array(PUBLIC_KEY.match(/.{1,2}/g)!.map((b: string) => parseInt(b, 16)));
  const sigBytes = new Uint8Array(signature.match(/.{1,2}/g)!.map((b: string) => parseInt(b, 16)));

  const cryptoKey = await crypto.subtle.importKey(
    "raw", keyBytes, { name: "Ed25519", namedCurve: "Ed25519" } as any, false, ["verify"]
  );

  return crypto.subtle.verify("Ed25519", cryptoKey, sigBytes, message);
}

// Hash password
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// Send DM to a Discord user
async function sendDM(userId: string, content: string) {
  const BOT_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN")!;
  try {
    // Create DM channel
    const dmRes = await fetch("https://discord.com/api/v10/users/@me/channels", {
      method: "POST",
      headers: { Authorization: `Bot ${BOT_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ recipient_id: userId }),
    });
    const dm = await dmRes.json();
    if (!dm.id) { console.error("Failed to create DM channel:", dm); return; }

    // Send message
    await fetch(`https://discord.com/api/v10/channels/${dm.id}/messages`, {
      method: "POST",
      headers: { Authorization: `Bot ${BOT_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
  } catch (e) { console.error("DM error:", e); }
}

// Find Discord user ID by username
async function findDiscordUserId(guildId: string, username: string): Promise<string | null> {
  const BOT_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN")!;
  try {
    const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/search?query=${encodeURIComponent(username)}&limit=5`, {
      headers: { Authorization: `Bot ${BOT_TOKEN}` },
    });
    const members = await res.json();
    if (Array.isArray(members)) {
      const match = members.find((m: any) => m.user?.username === username || m.user?.global_name === username);
      return match?.user?.id || null;
    }
  } catch (e) { console.error("Member search error:", e); }
  return null;
}

// Normalize discord username - try both with and without @
function normalizeDiscord(input: string): string[] {
  const clean = input.trim();
  if (clean.startsWith("@")) {
    return [clean, clean.slice(1)];
  }
  return [`@${clean}`, clean];
}

function getOption(options: any[], name: string): string | undefined {
  return options?.find((o: any) => o.name === name)?.value;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" } });
  }

  const body = await req.text();

  // Verify signature
  const isValid = await verifyDiscordSignature(req, body);
  if (!isValid) {
    return new Response("Invalid signature", { status: 401 });
  }

  const interaction = JSON.parse(body);

  // Handle PING
  if (interaction.type === INTERACTION_TYPE.PING) {
    return new Response(JSON.stringify({ type: INTERACTION_RESPONSE_TYPE.PONG }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Handle commands
  if (interaction.type === INTERACTION_TYPE.APPLICATION_COMMAND) {
    const { name, options } = interaction.data;
    const guildId = interaction.guild_id;
    const adminUser = interaction.member?.user?.username || "Discord Bot";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let responseContent = "⏳ جاري المعالجة...";

    try {
      if (name === "activate") {
        const discord = getOption(options, "discord_username")!;
        responseContent = await handleActivate(supabase, discord, adminUser);
      } else if (name === "deactivate") {
        const discord = getOption(options, "discord_username")!;
        const reason = getOption(options, "reason")!;
        responseContent = await handleDeactivate(supabase, discord, reason, adminUser);
      } else if (name === "accept-recruit") {
        const discord = getOption(options, "discord_username")!;
        const roleName = getOption(options, "role")!;
        responseContent = await handleAcceptRecruit(supabase, discord, roleName, adminUser, guildId);
      } else if (name === "reject-recruit") {
        const discord = getOption(options, "discord_username")!;
        const reason = getOption(options, "reason")!;
        responseContent = await handleRejectRecruit(supabase, discord, reason, adminUser);
      } else if (name === "dismiss") {
        const discord = getOption(options, "discord_username")!;
        const reason = getOption(options, "reason")!;
        responseContent = await handleDismiss(supabase, discord, reason, adminUser);
      } else if (name === "reset-stats") {
        const discord = getOption(options, "discord_username")!;
        responseContent = await handleResetStats(supabase, discord);
      } else if (name === "reset-password") {
        const discord = getOption(options, "discord_username")!;
        const newPassword = getOption(options, "new_password")!;
        responseContent = await handleResetPassword(supabase, discord, newPassword, adminUser);
      } else {
        responseContent = "❌ أمر غير معروف";
      }
    } catch (e) {
      console.error("Command error:", e);
      responseContent = `❌ خطأ: ${e.message}`;
    }

    return new Response(JSON.stringify({
      type: INTERACTION_RESPONSE_TYPE.CHANNEL_MESSAGE,
      data: { content: responseContent, flags: 64 }, // ephemeral
    }), { headers: { "Content-Type": "application/json" } });
  }

  return new Response("Unknown interaction type", { status: 400 });
});

// ============ Command Handlers ============

async function handleActivate(supabase: any, discord: string, adminUser: string): Promise<string> {
  const variants = normalizeDiscord(discord);
  const { data: pending } = await supabase
    .from("pending_users").select("*")
    .in("discord_username", variants).eq("status", "pending").maybeSingle();

  if (!pending) return `❌ لا يوجد طلب معلق لـ ${discord}`;

  const { error: insertError } = await supabase.from("approved_users").insert({
    id: pending.id, email: pending.email, discord_username: pending.discord_username,
    password_hash: pending.password_hash, approved_by_discord: adminUser,
  });
  if (insertError) return `❌ خطأ في التفعيل: ${insertError.message}`;

  await supabase.from("pending_users").update({ status: "approved", approved_at: new Date().toISOString() }).eq("id", pending.id);

  await fetch(DISCORD_REGISTRATION_WEBHOOK, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ embeds: [{ title: "✅ تم تفعيل حساب", color: 0x22c55e,
      fields: [
        { name: "يوزر الديسكورد", value: pending.discord_username, inline: true },
        { name: "الإيميل", value: pending.email, inline: true },
        { name: "بواسطة", value: adminUser, inline: true },
      ], timestamp: new Date().toISOString() }] }),
  });

  return `✅ تم تفعيل حساب **${pending.discord_username}** بنجاح`;
}

async function handleDeactivate(supabase: any, discord: string, reason: string, adminUser: string): Promise<string> {
  const variants = normalizeDiscord(discord);
  const { data: user } = await supabase
    .from("approved_users").select("*").in("discord_username", variants).maybeSingle();
  if (!user) return `❌ المستخدم ${discord} غير موجود`;

  await supabase.from("approved_users").delete().eq("id", user.id);
  await supabase.from("user_roles").delete().eq("user_id", user.id);
  await supabase.from("user_custom_roles").delete().eq("user_id", user.id);

  await supabase.from("pending_users").upsert({
    email: user.email, discord_username: user.discord_username, password_hash: user.password_hash,
    status: "rejected", deactivation_reason: reason, deactivated_by_discord: adminUser,
  }, { onConflict: "email" });

  return `🚫 تم سحب تفعيل **${user.discord_username}** - السبب: ${reason}`;
}

async function handleAcceptRecruit(supabase: any, discord: string, roleName: string, adminUser: string, guildId: string): Promise<string> {
  const variants = normalizeDiscord(discord);
  const { data: app } = await supabase
    .from("job_applications").select("*")
    .in("discord_username", variants).eq("status", "pending").maybeSingle();
  if (!app) return `❌ لا يوجد طلب توظيف معلق لـ ${discord}`;

  const { data: role } = await supabase
    .from("custom_roles").select("*").ilike("name", roleName).maybeSingle();
  if (!role) return `❌ الرتبة "${roleName}" غير موجودة`;

  const { data: existingApproved } = await supabase
    .from("approved_users").select("*").in("discord_username", variants).maybeSingle();
  const { data: pendingUser } = await supabase
    .from("pending_users").select("*").in("discord_username", variants).maybeSingle();

  let userId: string, email: string, password: string;

  if (existingApproved) {
    userId = existingApproved.id;
    email = existingApproved.email;
    password = "(نفس كلمة السر الحالية)";
  } else if (pendingUser && pendingUser.status === "pending") {
    userId = pendingUser.id;
    email = pendingUser.email;
    password = "(نفس كلمة السر المسجلة)";

    await supabase.from("approved_users").insert({
      id: userId, email, discord_username: app.discord_username,
      password_hash: pendingUser.password_hash, approved_by_discord: adminUser,
    });
    await supabase.from("pending_users").update({ status: "approved", approved_at: new Date().toISOString() }).eq("id", userId);
  } else {
    if (pendingUser) {
      try {
        const { data: { users } } = await supabase.auth.admin.listUsers();
        const oldAuth = users?.find((u: any) => u.email === pendingUser.email);
        if (oldAuth) await supabase.auth.admin.deleteUser(oldAuth.id);
      } catch (_) {}
      await supabase.from("pending_users").delete().eq("id", pendingUser.id);
    }

    email = `${app.discord_username.replace(/[^a-zA-Z0-9]/g, "")}@walkerfamily.shop`;
    password = app.account_name;
    const hashedPassword = await hashPassword(password);

    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email, password, email_confirm: true,
    });
    if (authError) return `❌ خطأ في إنشاء الحساب: ${authError.message}`;

    userId = authUser.user.id;
    const { error: approvedError } = await supabase.from("approved_users").insert({
      id: userId, email, discord_username: app.discord_username,
      password_hash: hashedPassword, approved_by_discord: adminUser,
    });
    if (approvedError) {
      await supabase.auth.admin.deleteUser(userId);
      return `❌ خطأ في إنشاء السجل: ${approvedError.message}`;
    }
  }

  await supabase.from("user_custom_roles").insert({
    user_id: userId!, role_id: role.id, assigned_by: adminUser,
  });

  await supabase.from("job_applications").update({
    status: "accepted", handled_by_discord: adminUser,
    assigned_role_id: role.id, processed_at: new Date().toISOString(),
  }).eq("id", app.id);

  await fetch(DISCORD_REGISTRATION_WEBHOOK, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ embeds: [{ title: "✅ تم قبول طلب توظيف", color: 0x22c55e,
      fields: [
        { name: "اسم الحساب", value: app.account_name, inline: true },
        { name: "اسم الشخصية", value: app.character_name, inline: true },
        { name: "يوزر الديسكورد", value: app.discord_username, inline: true },
        { name: "الرول", value: role.name, inline: true },
        { name: "الايميل", value: email, inline: true },
        { name: "بواسطة", value: adminUser, inline: true },
      ], timestamp: new Date().toISOString() }] }),
  });

  if (password !== "(نفس كلمة السر الحالية)" && password !== "(نفس كلمة السر المسجلة)") {
    const discordUserId = await findDiscordUserId(guildId, app.discord_username);
    if (discordUserId) {
      await sendDM(discordUserId, `🎉 **تهانينا! تم قبولك في Walker Family**\n\n📧 **الإيميل:** ${email}\n🔑 **كلمة السر:** ${password}\n🏷️ **الرتبة:** ${role.name}\n\n🔗 سجل دخولك من الموقع الآن!`);
    }
  }

  return `✅ تم قبول **${app.discord_username}** وتعيين رتبة **${role.name}**${password !== "(نفس كلمة السر الحالية)" && password !== "(نفس كلمة السر المسجلة)" ? `\n📧 الإيميل: ${email}\n🔑 كلمة السر: ${password}` : ""}`;
}

async function handleRejectRecruit(supabase: any, discord: string, reason: string, adminUser: string): Promise<string> {
  const variants = normalizeDiscord(discord);
  const { data: app } = await supabase
    .from("job_applications").select("*")
    .in("discord_username", variants).eq("status", "pending").maybeSingle();
  if (!app) return `❌ لا يوجد طلب توظيف معلق لـ ${discord}`;

  await supabase.from("job_applications").update({
    status: "rejected", rejection_reason: reason,
    handled_by_discord: adminUser, processed_at: new Date().toISOString(),
  }).eq("id", app.id);

  await fetch(DISCORD_REGISTRATION_WEBHOOK, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ embeds: [{ title: "❌ تم رفض طلب توظيف", color: 0xef4444,
      fields: [
        { name: "يوزر الديسكورد", value: app.discord_username, inline: true },
        { name: "السبب", value: reason, inline: false },
        { name: "بواسطة", value: adminUser, inline: true },
      ], timestamp: new Date().toISOString() }] }),
  });

  return `❌ تم رفض طلب توظيف **${app.discord_username}** - السبب: ${reason}`;
}

async function handleDismiss(supabase: any, discord: string, reason: string, adminUser: string): Promise<string> {
  const variants = normalizeDiscord(discord);
  const { data: user } = await supabase
    .from("approved_users").select("*").in("discord_username", variants).maybeSingle();
  if (!user) return `❌ المستخدم ${discord} غير موجود`;

  const { data: roles } = await supabase
    .from("user_custom_roles").select("*").eq("user_id", user.id);
  if (!roles || roles.length === 0) return `❌ ${user.discord_username} ليس بائعاً (لا يملك رتب)`;

  await supabase.from("user_custom_roles").delete().eq("user_id", user.id);
  await supabase.from("approved_users").delete().eq("id", user.id);
  await supabase.from("user_roles").delete().eq("user_id", user.id);

  await supabase.from("pending_users").upsert({
    email: user.email, discord_username: user.discord_username, password_hash: user.password_hash,
    status: "rejected", deactivation_reason: reason, deactivated_by_discord: adminUser,
  }, { onConflict: "email" });

  return `🔥 تم فصل **${user.discord_username}** - السبب: ${reason}`;
}

async function handleResetStats(supabase: any, discord: string): Promise<string> {
  const variants = normalizeDiscord(discord);
  const { data: user } = await supabase
    .from("approved_users").select("id, discord_username, email").in("discord_username", variants).maybeSingle();
  if (!user) return `❌ المستخدم ${discord} غير موجود`;

  await supabase.from("orders")
    .update({ handled_by_email: null, handled_by_discord: null })
    .or(`handled_by_email.eq.${user.email},handled_by_discord.eq.${user.discord_username}`);

  await supabase.from("staff_checkins").delete().eq("user_id", user.id);

  return `📊 تم تصفير إحصائيات **${user.discord_username}** بنجاح`;
}

async function handleResetPassword(supabase: any, discord: string, newPassword: string, adminUser: string): Promise<string> {
  if (newPassword.length < 6) return "❌ كلمة السر يجب أن تكون 6 أحرف على الأقل";

  const variants = normalizeDiscord(discord);
  const { data: user } = await supabase
    .from("approved_users").select("*").in("discord_username", variants).maybeSingle();
  if (!user) return `❌ المستخدم ${discord} غير موجود`;

  const hashedPassword = await hashPassword(newPassword);
  await supabase.from("approved_users").update({ password_hash: hashedPassword }).eq("id", user.id);
  await supabase.auth.admin.updateUserById(user.id, { password: newPassword });

  return `🔑 تم تغيير كلمة سر **${user.discord_username}** بنجاح`;
}
