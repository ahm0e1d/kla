import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Briefcase, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

const RecruitmentPage = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isRecruitmentOpen, setIsRecruitmentOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [formData, setFormData] = useState({
    accountName: "",
    characterName: "",
    discordUsername: "",
    level: "",
    gameId: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    const shopUser = localStorage.getItem("shop_user");
    setIsLoggedIn(!!shopUser);
  }, []);

  useEffect(() => {
    fetchRecruitmentStatus();

    const channel = supabase
      .channel("recruitment-status-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "site_settings",
        },
        (payload) => {
          const key = (payload.new as { key?: string })?.key;
          if (key === "recruitment_open") {
            fetchRecruitmentStatus();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRecruitmentStatus = async () => {
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "recruitment_open")
        .maybeSingle();

      if (!error && data) {
        setIsRecruitmentOpen(data.value as boolean);
      }
    } catch (error) {
      console.error("Error fetching recruitment status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.accountName || !formData.characterName || !formData.discordUsername || !formData.level || !formData.gameId) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.from("job_applications").insert({
        account_name: formData.accountName,
        character_name: formData.characterName,
        discord_username: formData.discordUsername,
        level: formData.level,
        game_id: formData.gameId,
      });

      if (error) throw error;

      // Send Discord webhook for new application
      const DISCORD_REGISTRATION_WEBHOOK = "https://discord.com/api/webhooks/1457132689563062424/qfdrnt0rcubQqRzlkWjIvMNrj4pfPHf25Dk6Xz9_hh6ChXPe359iPFEpqu9D94Msrdgt";
      
      const embed = {
        title: "📋 طلب توظيف جديد",
        color: 0x3b82f6,
        fields: [
          { name: "👤 اسم الحساب", value: formData.accountName, inline: true },
          { name: "🎮 اسم الشخصية", value: formData.characterName, inline: true },
          { name: "💬 يوزر الديسكورد", value: formData.discordUsername, inline: true },
          { name: "⭐ الفل", value: formData.level, inline: true },
          { name: "🆔 الايدي", value: formData.gameId, inline: true },
        ],
        timestamp: new Date().toISOString(),
        footer: { text: "Walker Family Shop - Recruitment" },
      };

      await fetch(DISCORD_REGISTRATION_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embeds: [embed] }),
      });

      toast({
        title: "تم إرسال طلبك بنجاح",
        description: "سيتم مراجعة طلبك من قبل الإدارة",
      });

      setFormData({
        accountName: "",
        characterName: "",
        discordUsername: "",
        level: "",
        gameId: "",
      });
    } catch (error) {
      console.error("Error submitting application:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إرسال الطلب",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center py-8 px-4" dir="rtl">
        <Card className="bg-card/80 backdrop-blur-xl border-border max-w-md w-full">
          <CardContent className="text-center py-8 space-y-4">
            <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-xl font-semibold text-muted-foreground">
              يجب تسجيل الدخول أولاً
            </p>
            <p className="text-sm text-muted-foreground">
              سجّل دخولك لتتمكن من التقديم على التوظيف
            </p>
            <a href="/auth">
              <Button className="mt-2">تسجيل الدخول</Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4" dir="rtl">
      <div className="container mx-auto max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="bg-card/80 backdrop-blur-xl border-border">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4">
                <Briefcase className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold text-gradient">
                التوظيف
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isRecruitmentOpen ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="accountName">اسم الحساب</Label>
                    <Input
                      id="accountName"
                      value={formData.accountName}
                      onChange={(e) =>
                        setFormData({ ...formData, accountName: e.target.value })
                      }
                      placeholder="أدخل اسم الحساب"
                      className="bg-background/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="characterName">اسم الشخصية</Label>
                    <Input
                      id="characterName"
                      value={formData.characterName}
                      onChange={(e) =>
                        setFormData({ ...formData, characterName: e.target.value })
                      }
                      placeholder="أدخل اسم الشخصية"
                      className="bg-background/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="discordUsername">يوزر الديسكورد</Label>
                    <Input
                      id="discordUsername"
                      value={formData.discordUsername}
                      onChange={(e) =>
                        setFormData({ ...formData, discordUsername: e.target.value })
                      }
                      placeholder="أدخل يوزر الديسكورد"
                      className="bg-background/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="level">الفل</Label>
                    <Input
                      id="level"
                      value={formData.level}
                      onChange={(e) =>
                        setFormData({ ...formData, level: e.target.value })
                      }
                      placeholder="أدخل مستواك"
                      className="bg-background/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gameId">الايدي</Label>
                    <Input
                      id="gameId"
                      value={formData.gameId}
                      onChange={(e) =>
                        setFormData({ ...formData, gameId: e.target.value })
                      }
                      placeholder="أدخل الايدي"
                      className="bg-background/50"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                        جاري الإرسال...
                      </>
                    ) : (
                      "إرسال الطلب"
                    )}
                  </Button>
                </form>
              ) : (
                <div className="text-center py-8 space-y-4">
                  <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-xl font-semibold text-muted-foreground">
                    التوظيف مغلق حالياً
                  </p>
                  <p className="text-sm text-muted-foreground">
                    يرجى المحاولة لاحقاً عندما يفتح باب التوظيف
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default RecruitmentPage;
