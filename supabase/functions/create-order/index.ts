import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderRequest {
  user_id: string;
  account_name: string;
  character_name: string;
  discord_username: string;
  game_id: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  total: number;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const orderData: OrderRequest = await req.json();

    console.log("Creating order:", orderData);

    // Insert order
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        user_id: orderData.user_id,
        account_name: orderData.account_name,
        character_name: orderData.character_name,
        discord_username: orderData.discord_username,
        game_id: orderData.game_id,
        items: orderData.items,
        total: orderData.total,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating order:", error);
      return new Response(
        JSON.stringify({ error: "فشل في إنشاء الطلب" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Order created:", order);

    return new Response(
      JSON.stringify({ success: true, order }),
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
