import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1457782854560907587/BHqVtn-Q9NtS_L-rLOynSSQMYyp8m31SJ7VkhYkvxClagnBh5g5Gi4UCa-YVnl3IRwTA";

// Get current time in UTC+3 (Iraq/Saudi timezone)
function getNowUTC3() {
  const now = new Date();
  const utc3 = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  return {
    hours: utc3.getUTCHours(),
    minutes: utc3.getUTCMinutes(),
  };
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch store settings
    const { data, error } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", [
        "morning_shift_enabled",
        "morning_shift_start",
        "morning_shift_end",
        "evening_shift_enabled",
        "evening_shift_start",
        "evening_shift_end",
        "store_vacation_mode",
        "store_vacation_message",
        "store_discord_message",
      ]);

    if (error) throw error;

    const settings: Record<string, unknown> = {};
    data?.forEach((s: { key: string; value: unknown }) => {
      settings[s.key] = s.value;
    });

    const isVacation = settings.store_vacation_mode as boolean || false;
    const morningEnabled = settings.morning_shift_enabled as boolean || false;
    const eveningEnabled = settings.evening_shift_enabled as boolean || false;
    const morningStart = settings.morning_shift_start as string || "08:00";
    const morningEnd = settings.morning_shift_end as string || "14:00";
    const eveningStart = settings.evening_shift_start as string || "16:00";
    const eveningEnd = settings.evening_shift_end as string || "22:00";
    const vacationMessage = settings.store_vacation_message as string || "";
    const discordMessage = settings.store_discord_message as string || "";

    // If vacation mode, don't auto-send
    if (isVacation) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "vacation_mode" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { hours, minutes } = getNowUTC3();
    const currentMinutes = hours * 60 + minutes;

    // Check if current time matches any shift start or end (within 1 minute window)
    let shouldSend = false;
    let isOpen = false;

    if (morningEnabled) {
      const mStart = timeToMinutes(morningStart);
      const mEnd = timeToMinutes(morningEnd);
      if (currentMinutes === mStart) {
        shouldSend = true;
        isOpen = true;
      }
      if (currentMinutes === mEnd && !eveningEnabled) {
        shouldSend = true;
        isOpen = false;
      }
    }

    if (eveningEnabled) {
      const eStart = timeToMinutes(eveningStart);
      const eEnd = timeToMinutes(eveningEnd);
      if (currentMinutes === eStart) {
        shouldSend = true;
        isOpen = true;
      }
      // Handle midnight crossing
      if (eEnd <= eStart) {
        if (currentMinutes === eEnd) {
          shouldSend = true;
          isOpen = false;
        }
      } else {
        if (currentMinutes === eEnd) {
          shouldSend = true;
          isOpen = false;
        }
      }
    }

    // Check gap between shifts - when morning ends and evening hasn't started
    if (morningEnabled && eveningEnabled) {
      const mEnd = timeToMinutes(morningEnd);
      if (currentMinutes === mEnd) {
        shouldSend = true;
        isOpen = false; // Between shifts = closed
      }
    }

    if (!shouldSend) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "not_shift_boundary", currentTime: `${hours}:${minutes}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build and send Discord embed
    const statusEmoji = isOpen ? "🟢" : "🔴";
    const statusText = isOpen ? "مفتوح" : "مغلق";
    const color = isOpen ? 0x22c55e : 0xef4444;

    const fields = [];

    const shiftInfo: string[] = [];
    if (morningEnabled) {
      shiftInfo.push(`✅ الشفت الصباحي (${morningStart} - ${morningEnd})`);
    }
    if (eveningEnabled) {
      shiftInfo.push(`✅ الشفت المسائي (${eveningStart} - ${eveningEnd})`);
    }
    if (shiftInfo.length > 0) {
      fields.push({ name: "⚡ الشفتات", value: shiftInfo.join("\n"), inline: false });
    }

    if (discordMessage && discordMessage.trim()) {
      fields.push({ name: "💬 رسالة", value: discordMessage, inline: false });
    }

    const embed = {
      title: `${statusEmoji} حالة المتجر: ${statusText}`,
      color,
      fields,
      timestamp: new Date().toISOString(),
      footer: { text: "Walker Family Shop - تحديث تلقائي" },
    };

    const webhookResponse = await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });

    if (!webhookResponse.ok) {
      throw new Error(`Discord webhook failed: ${webhookResponse.status}`);
    }

    return new Response(
      JSON.stringify({ success: true, sent: true, isOpen, time: `${hours}:${minutes}` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "حدث خطأ" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
