import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LoginRequest {
  discord_username: string;
  password: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { discord_username, password }: LoginRequest = await req.json();

    console.log("Login attempt:", { discord_username });

    if (!discord_username || !password) {
      return new Response(
        JSON.stringify({ error: "جميع الحقول مطلوبة" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Hash the password
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const passwordHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    // Check if user exists in approved_users
    const { data: approvedUser, error: approvedError } = await supabase
      .from("approved_users")
      .select("*")
      .eq("discord_username", discord_username)
      .eq("password_hash", passwordHash)
      .maybeSingle();

    if (approvedUser) {
      // Update last login
      await supabase
        .from("approved_users")
        .update({ last_login: new Date().toISOString() })
        .eq("id", approvedUser.id);

      console.log("User logged in:", approvedUser.id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          user: {
            id: approvedUser.id,
            email: approvedUser.email,
            discord_username: approvedUser.discord_username
          }
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is pending
    const { data: pendingUser } = await supabase
      .from("pending_users")
      .select("status")
      .eq("discord_username", discord_username)
      .maybeSingle();

    if (pendingUser) {
      if (pendingUser.status === "pending") {
        return new Response(
          JSON.stringify({ error: "حسابك لم يتم تفعيله بعد، انتظر موافقة المالك" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else if (pendingUser.status === "rejected") {
        return new Response(
          JSON.stringify({ error: "تم رفض طلب تسجيلك" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: "يوزر Discord أو كلمة المرور غير صحيحة" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "حدث خطأ غير متوقع" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
