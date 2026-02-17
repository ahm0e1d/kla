import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1457134764271079586/BFePlTsm_MYu9nr6rYbDaFZIQYhIxLhp_nm_LXyC3JvEZoe1-hLagsw-uI_rboLNJUPV";

interface OrderActionRequest {
  order_id: string;
  action: "accept" | "complete" | "reject";
  admin_email?: string;
  admin_discord?: string;
  rejection_reason?: string;
  proof_image_url?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { order_id, action = "complete", admin_email, admin_discord, rejection_reason, proof_image_url }: OrderActionRequest = await req.json();

    console.log("Order action:", { order_id, action, admin_email, admin_discord, proof_image_url: !!proof_image_url });

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      console.error("Order not found:", orderError);
      return new Response(
        JSON.stringify({ error: "الطلب غير موجود" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const items = order.items as Array<{ name: string; quantity: number; price: number }>;
    const itemsList = items
      .map((item) => `• ${item.name} - الكمية: ${item.quantity} - السعر: ${item.price.toLocaleString()}`)
      .join("\n");

    if (action === "accept") {
      // Admin accepts the order - changes status to accepted
      const { error: updateError } = await supabase
        .from("orders")
        .update({ 
          status: "accepted",
          handled_by_email: admin_email,
          handled_by_discord: admin_discord
        })
        .eq("id", order_id);

      if (updateError) {
        console.error("Error updating order:", updateError);
        return new Response(
          JSON.stringify({ error: "فشل في تحديث الطلب" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Send Discord notification for acceptance
      try {
        const discordPayload = {
          embeds: [{
            title: "📦 تم استلام طلب",
            color: 0x3b82f6,
            fields: [
              { name: "🎫 رقم الطلب", value: order.order_number, inline: false },
              { name: "👤 اسم الحساب", value: order.account_name, inline: true },
              { name: "🎮 اسم الشخصية", value: order.character_name, inline: true },
              { name: "💬 يوزر الديسكورد", value: order.discord_username, inline: true },
              { name: "🆔 الايدي", value: order.game_id, inline: true },
              { name: "📦 المنتجات", value: itemsList, inline: false },
              { name: "💰 المجموع", value: order.total.toLocaleString(), inline: true },
              { name: "👨‍💼 المستلم", value: admin_discord || admin_email || "غير معروف", inline: true },
            ],
            footer: { text: "Walker Family Shop - قيد التجهيز" },
            timestamp: new Date().toISOString()
          }]
        };

        await fetch(DISCORD_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(discordPayload)
        });

        console.log("Discord notification sent for accepted order:", order.order_number);
      } catch (discordError) {
        console.error("Discord webhook error:", discordError);
      }

      return new Response(
        JSON.stringify({ success: true, message: "تم استلام الطلب بنجاح" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (action === "reject") {
      // Admin rejects the order
      const { error: updateError } = await supabase
        .from("orders")
        .update({ 
          status: "rejected",
          rejection_reason: rejection_reason,
          handled_by_email: admin_email,
          handled_by_discord: admin_discord
        })
        .eq("id", order_id);

      if (updateError) {
        console.error("Error updating order:", updateError);
        return new Response(
          JSON.stringify({ error: "فشل في تحديث الطلب" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Send Discord notification for rejection
      try {
        const discordPayload = {
          embeds: [{
            title: "❌ تم رفض طلب",
            color: 0xef4444,
            fields: [
              { name: "🎫 رقم الطلب", value: order.order_number, inline: false },
              { name: "👤 اسم الحساب", value: order.account_name, inline: true },
              { name: "🎮 اسم الشخصية", value: order.character_name, inline: true },
              { name: "💬 يوزر الديسكورد", value: order.discord_username, inline: true },
              { name: "🆔 الايدي", value: order.game_id, inline: true },
              { name: "📦 المنتجات", value: itemsList, inline: false },
              { name: "💰 المجموع", value: order.total.toLocaleString(), inline: true },
              { name: "👨‍💼 الرافض", value: admin_discord || admin_email || "غير معروف", inline: true },
              { name: "📝 سبب الرفض", value: rejection_reason || "لم يتم تحديد سبب", inline: false },
            ],
            footer: { text: "Walker Family Shop - تم الرفض" },
            timestamp: new Date().toISOString()
          }]
        };

        await fetch(DISCORD_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(discordPayload)
        });

        console.log("Discord notification sent for rejected order:", order.order_number);
      } catch (discordError) {
        console.error("Discord webhook error:", discordError);
      }

      return new Response(
        JSON.stringify({ success: true, message: "تم رفض الطلب" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else {
      // Complete the order (default action)
      const { error: updateError } = await supabase
        .from("orders")
        .update({ 
          status: "completed",
          handled_by_email: admin_email || order.handled_by_email,
          handled_by_discord: admin_discord || order.handled_by_discord
        })
        .eq("id", order_id);

      if (updateError) {
        console.error("Error updating order:", updateError);
        return new Response(
          JSON.stringify({ error: "فشل في تحديث الطلب" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Send Discord notification for completion
      try {
        const discordPayload = {
          embeds: [{
            title: "✅ تم تسليم طلب",
            color: 0x22c55e,
            fields: [
              { name: "🎫 رقم الطلب", value: order.order_number, inline: false },
              { name: "👤 اسم الحساب", value: order.account_name, inline: true },
              { name: "🎮 اسم الشخصية", value: order.character_name, inline: true },
              { name: "💬 يوزر الديسكورد", value: order.discord_username, inline: true },
              { name: "🆔 الايدي", value: order.game_id, inline: true },
              { name: "📦 المنتجات", value: itemsList, inline: false },
              { name: "💰 المجموع", value: order.total.toLocaleString(), inline: true },
              { name: "👨‍💼 المسلم", value: admin_discord || order.handled_by_discord || admin_email || order.handled_by_email || "غير معروف", inline: true },
            ],
            ...(proof_image_url ? { image: { url: proof_image_url } } : {}),
            footer: { text: "Walker Family Shop - تم التسليم" },
            timestamp: new Date().toISOString()
          }]
        };

        await fetch(DISCORD_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(discordPayload)
        });

        console.log("Discord notification sent for completed order:", order.order_number);
      } catch (discordError) {
        console.error("Discord webhook error:", discordError);
      }

      return new Response(
        JSON.stringify({ success: true, message: "تم تسليم الطلب بنجاح" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "حدث خطأ غير متوقع" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});