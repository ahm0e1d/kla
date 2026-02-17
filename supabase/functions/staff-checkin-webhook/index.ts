import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1462204374951399516/QrZd3YehncHuTXxnqjUEyfYDwzOnlZY37kI-yqAI2IqlG5j5mjW0D_KH7SQ2qP81aNzv";

interface StaffCheckinRequest {
  action: "checkin" | "checkout" | "get_status";
  user_id?: string;
  discord_username?: string;
  user_email?: string;
}

interface StaffMember {
  id: string;
  user_id: string;
  is_active: boolean;
  checked_in_at: string;
  discord_username?: string;
  role?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, user_id, discord_username, user_email }: StaffCheckinRequest = await req.json();

    if (action === "get_status") {
      // Get all active staff with their roles
      const { data: activeStaff, error: staffError } = await supabase
        .from("staff_checkins")
        .select(`
          id,
          user_id,
          is_active,
          checked_in_at,
          approved_users!inner(discord_username, email)
        `)
        .eq("is_active", true);

      if (staffError) throw staffError;

      // Get roles for each staff member
      const staffWithRoles = await Promise.all(
        (activeStaff || []).map(async (staff: any) => {
          // Get user roles
          const { data: userRoles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", staff.user_id)
            .is("removed_at", null);

          // Get custom roles
          const { data: customRoles } = await supabase
            .from("user_custom_roles")
            .select("custom_roles(name)")
            .eq("user_id", staff.user_id);

          const roles: string[] = [];
          userRoles?.forEach((r: any) => roles.push(r.role === 'admin' ? 'أدمن' : 'مستخدم'));
          customRoles?.forEach((r: any) => {
            if (r.custom_roles?.name) roles.push(r.custom_roles.name);
          });

          return {
            id: staff.id,
            user_id: staff.user_id,
            discord_username: staff.approved_users?.discord_username,
            email: staff.approved_users?.email,
            checked_in_at: staff.checked_in_at,
            roles: roles.length > 0 ? roles : ['عضو'],
          };
        })
      );

      return new Response(
        JSON.stringify({ success: true, staff: staffWithRoles }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "checkin" && user_id) {
      // Check if already checked in
      const { data: existing } = await supabase
        .from("staff_checkins")
        .select("id")
        .eq("user_id", user_id)
        .eq("is_active", true)
        .single();

      if (existing) {
        return new Response(
          JSON.stringify({ error: "أنت مسجل دخول بالفعل" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create new checkin
      const { error: insertError } = await supabase
        .from("staff_checkins")
        .insert({
          user_id,
          is_active: true,
        });

      if (insertError) throw insertError;

      // Send webhook
      await sendWebhookUpdate(supabase, discord_username || user_email || "مستخدم", "checkin");

      return new Response(
        JSON.stringify({ success: true, message: "تم تسجيل الدخول بنجاح" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "checkout" && user_id) {
      // Update checkin record
      const { error: updateError } = await supabase
        .from("staff_checkins")
        .update({
          is_active: false,
          checked_out_at: new Date().toISOString(),
        })
        .eq("user_id", user_id)
        .eq("is_active", true);

      if (updateError) throw updateError;

      // Send webhook
      await sendWebhookUpdate(supabase, discord_username || user_email || "مستخدم", "checkout");

      return new Response(
        JSON.stringify({ success: true, message: "تم تسجيل الخروج بنجاح" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
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

async function sendWebhookUpdate(supabase: any, username: string, action: "checkin" | "checkout") {
  try {
    // Get all active staff with roles
    const { data: activeStaff } = await supabase
      .from("staff_checkins")
      .select(`
        user_id,
        checked_in_at,
        approved_users!inner(discord_username, email)
      `)
      .eq("is_active", true);

    // Group staff by roles
    const staffByRole: Record<string, Array<{ name: string; time: string }>> = {};

    for (const staff of activeStaff || []) {
      // Get user roles
      const { data: userRoles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", staff.user_id)
        .is("removed_at", null);

      // Get custom roles
      const { data: customRoles } = await supabase
        .from("user_custom_roles")
        .select("custom_roles(name)")
        .eq("user_id", staff.user_id);

      const roles: string[] = [];
      userRoles?.forEach((r: any) => roles.push(r.role === 'admin' ? 'الإدارة' : 'الأعضاء'));
      customRoles?.forEach((r: any) => {
        if (r.custom_roles?.name) roles.push(r.custom_roles.name);
      });

      if (roles.length === 0) roles.push('الأعضاء');

      const displayName = staff.approved_users?.discord_username || staff.approved_users?.email || 'مستخدم';
      // Convert to UTC+3 for Iraq/Saudi timezone
      const checkinDate = new Date(staff.checked_in_at);
      const utc3Date = new Date(checkinDate.getTime() + 3 * 60 * 60 * 1000);
      const checkinHours = utc3Date.getUTCHours().toString().padStart(2, '0');
      const checkinMins = utc3Date.getUTCMinutes().toString().padStart(2, '0');
      const checkinTime = `${checkinHours}:${checkinMins}`;

      for (const role of roles) {
        if (!staffByRole[role]) staffByRole[role] = [];
        if (!staffByRole[role].find(s => s.name === displayName)) {
          staffByRole[role].push({ name: displayName, time: checkinTime });
        }
      }
    }

    // Build embed fields
    const fields = Object.entries(staffByRole).map(([role, members]) => ({
      name: `📋 ${role}`,
      value: members.map(m => `✅ ${m.name} (${m.time})`).join('\n') || 'لا يوجد',
      inline: false,
    }));

    if (fields.length === 0) {
      fields.push({
        name: '📋 الموظفين',
        value: '❌ لا يوجد موظفين متاحين حالياً',
        inline: false,
      });
    }

    const actionEmoji = action === "checkin" ? "✅" : "❌";
    const actionText = action === "checkin" ? "سجل دخول" : "سجل خروج";
    const color = action === "checkin" ? 0x22c55e : 0xef4444;

    const embed = {
      title: `${actionEmoji} ${username} ${actionText}`,
      description: `**الموظفين المتاحين حالياً:**`,
      color: color,
      fields: fields,
      timestamp: new Date().toISOString(),
      footer: {
        text: "Walker Family Shop - نظام تسجيل الخدمة",
      },
    };

    await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });
  } catch (error) {
    console.error("Error sending webhook:", error);
  }
}
