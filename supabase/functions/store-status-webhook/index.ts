import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1457782854560907587/BHqVtn-Q9NtS_L-rLOynSSQMYyp8m31SJ7VkhYkvxClagnBh5g5Gi4UCa-YVnl3IRwTA";

interface StoreStatusRequest {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  workingDays?: string;
  isVacation?: boolean;
  vacationMessage?: string;
  customMessage?: string;
  // Morning shift
  morningShiftEnabled?: boolean;
  morningShiftStart?: string;
  morningShiftEnd?: string;
  // Evening shift
  eveningShiftEnabled?: boolean;
  eveningShiftStart?: string;
  eveningShiftEnd?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      isOpen, 
      openTime, 
      closeTime, 
      workingDays,
      isVacation,
      vacationMessage,
      customMessage,
      morningShiftEnabled,
      morningShiftStart,
      morningShiftEnd,
      eveningShiftEnabled,
      eveningShiftStart,
      eveningShiftEnd,
    }: StoreStatusRequest = await req.json();

    let statusEmoji: string;
    let statusText: string;
    let color: number;

    if (isVacation) {
      statusEmoji = "🏖️";
      statusText = "في عطلة";
      color = 0xf59e0b; // Yellow/Orange
    } else if (isOpen) {
      statusEmoji = "🟢";
      statusText = "مفتوح";
      color = 0x22c55e; // Green
    } else {
      statusEmoji = "🔴";
      statusText = "مغلق";
      color = 0xef4444; // Red
    }

    const fields = [];

    // If vacation mode - only show vacation message, no working hours
    if (isVacation) {
      if (vacationMessage) {
        fields.push({
          name: "📝 رسالة العطلة",
          value: vacationMessage,
          inline: false,
        });
      }
    } else {
      // Show shift information if not on vacation
      const shiftInfo: string[] = [];
      
      if (morningShiftEnabled !== undefined) {
        const morningStatus = morningShiftEnabled ? "✅" : "❌";
        const morningTime = morningShiftStart && morningShiftEnd ? ` (${morningShiftStart} - ${morningShiftEnd})` : "";
        shiftInfo.push(`${morningStatus} الشفت الصباحي${morningTime}`);
      }
      
      if (eveningShiftEnabled !== undefined) {
        const eveningStatus = eveningShiftEnabled ? "✅" : "❌";
        const eveningTime = eveningShiftStart && eveningShiftEnd ? ` (${eveningShiftStart} - ${eveningShiftEnd})` : "";
        shiftInfo.push(`${eveningStatus} الشفت المسائي${eveningTime}`);
      }

      if (shiftInfo.length > 0) {
        fields.push({
          name: "⚡ الشفتات",
          value: shiftInfo.join("\n"),
          inline: false,
        });
      }

      // Working hours removed - only shifts are shown
    }

    // Add custom message if provided (always show)
    if (customMessage && customMessage.trim()) {
      fields.push({
        name: "💬 رسالة",
        value: customMessage,
        inline: false,
      });
    }

    const embed = {
      title: `${statusEmoji} حالة المتجر: ${statusText}`,
      color: color,
      fields: fields,
      timestamp: new Date().toISOString(),
      footer: {
        text: "Walker Family Shop",
      },
    };

    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        embeds: [embed],
      }),
    });

    if (!response.ok) {
      throw new Error(`Discord webhook failed: ${response.status}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "حدث خطأ أثناء إرسال الإشعار" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
