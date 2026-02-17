import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check, X, Briefcase, User, Send, ScrollText } from "lucide-react";

interface JobApplication {
  id: string;
  account_name: string;
  character_name: string;
  discord_username: string;
  level: string;
  game_id: string;
  status: string;
  created_at: string;
  handled_by_email?: string;
  handled_by_discord?: string;
  assigned_role_id?: string;
  rejection_reason?: string;
  processed_at?: string;
}

interface CustomRole {
  id: string;
  name: string;
}

interface RecruitmentTabProps {
  adminEmail: string;
  adminDiscord?: string;
}

// Announcements webhook (for recruitment open/close status)
const DISCORD_ANNOUNCEMENTS_WEBHOOK = "https://discord.com/api/webhooks/1471047184291201116/pp-hJbKvUZMaDkFONuoNwRIP-maz2lzwI2VbtEmjJheYlYJEyaY5tsmJ4THId_iSERzN";
// Registration webhook (for new applications and rejections)
const DISCORD_REGISTRATION_WEBHOOK = "https://discord.com/api/webhooks/1457132689563062424/qfdrnt0rcubQqRzlkWjIvMNrj4pfPHf25Dk6Xz9_hh6ChXPe359iPFEpqu9D94Msrdgt";

const RecruitmentTab = ({ adminEmail, adminDiscord }: RecruitmentTabProps) => {
  const [loading, setLoading] = useState(true);
  const [isRecruitmentOpen, setIsRecruitmentOpen] = useState(false);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processedApplications, setProcessedApplications] = useState<JobApplication[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch recruitment status
      const { data: settingsData } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "recruitment_open")
        .maybeSingle();

      if (settingsData) {
        setIsRecruitmentOpen(settingsData.value as boolean);
      }

      // Fetch pending applications
      const { data: applicationsData } = await supabase
        .from("job_applications")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (applicationsData) {
        setApplications(applicationsData);
      }

      // Fetch processed applications (accepted/rejected)
      const { data: processedData } = await supabase
        .from("job_applications")
        .select("*")
        .in("status", ["accepted", "rejected"])
        .order("processed_at", { ascending: false });

      if (processedData) {
        setProcessedApplications(processedData);
      }

      // Fetch custom roles
      const { data: rolesData } = await supabase
        .from("custom_roles")
        .select("id, name")
        .order("name");

      if (rolesData) {
        setRoles(rolesData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRecruitment = async () => {
    const newStatus = !isRecruitmentOpen;
    
    try {
      const { error } = await supabase
        .from("site_settings")
        .upsert({
          key: "recruitment_open",
          value: newStatus,
          updated_by: adminEmail,
        }, { onConflict: "key" });

      if (error) throw error;

      setIsRecruitmentOpen(newStatus);

      // Send Discord webhook to STORE STATUS webhook
      await sendRecruitmentStatusWebhook(newStatus);

      toast({
        title: newStatus ? "تم فتح التوظيف" : "تم إغلاق التوظيف",
        description: newStatus ? "يمكن للمتقدمين الآن إرسال طلباتهم" : "تم إغلاق باب التوظيف",
      });
    } catch (error) {
      console.error("Error toggling recruitment:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تغيير حالة التوظيف",
        variant: "destructive",
      });
    }
  };

  const sendRecruitmentStatusWebhook = async (isOpen: boolean) => {
    const embed = {
      title: isOpen ? "📢 تم فتح باب التوظيف" : "🔒 تم إغلاق باب التوظيف",
      color: isOpen ? 0x22c55e : 0xef4444,
      fields: [
        {
          name: "📋 الحالة",
          value: isOpen ? "التوظيف مفتوح الآن - يمكنكم التقديم" : "التوظيف مغلق حالياً",
          inline: false,
        },
        {
          name: "👤 بواسطة",
          value: adminDiscord || adminEmail,
          inline: true,
        },
        {
          name: "🛡️ المشرف المسؤول",
          value: adminDiscord || adminEmail,
          inline: true,
        },
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: "Walker Family Shop",
      },
    };

    try {
      // Send to announcements webhook (recruitment open/close)
      await fetch(DISCORD_ANNOUNCEMENTS_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embeds: [embed] }),
      });
    } catch (error) {
      console.error("Error sending recruitment webhook:", error);
    }
  };

  const openAcceptDialog = (application: JobApplication) => {
    setSelectedApplication(application);
    setSelectedRole("");
    setAcceptDialogOpen(true);
  };

  const openRejectDialog = (application: JobApplication) => {
    setSelectedApplication(application);
    setRejectionReason("");
    setRejectDialogOpen(true);
  };

  const handleAccept = async () => {
    if (!selectedApplication || !selectedRole) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار الرول",
        variant: "destructive",
      });
      return;
    }

    setProcessingId(selectedApplication.id);

    try {
      // Call edge function to create user account and assign role
      const response = await supabase.functions.invoke("process-job-application", {
        body: {
          applicationId: selectedApplication.id,
          action: "accept",
          roleId: selectedRole,
          adminEmail,
          adminDiscord,
        },
      });

      if (response.error) throw response.error;

      // Remove from list
      const acceptedApp = { ...selectedApplication, status: "accepted", processed_at: new Date().toISOString() };
      setApplications(applications.filter(app => app.id !== selectedApplication.id));
      setProcessedApplications(prev => [acceptedApp, ...prev]);
      setAcceptDialogOpen(false);

      toast({
        title: "تم قبول الطلب",
        description: `تم قبول ${selectedApplication.discord_username} وإنشاء حسابه`,
      });
    } catch (error) {
      console.error("Error accepting application:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء قبول الطلب",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!selectedApplication) return;

    setProcessingId(selectedApplication.id);

    try {
      const { error } = await supabase
        .from("job_applications")
        .update({
          status: "rejected",
          handled_by_email: adminEmail,
          handled_by_discord: adminDiscord,
          rejection_reason: rejectionReason || null,
          processed_at: new Date().toISOString(),
        })
        .eq("id", selectedApplication.id);

      if (error) throw error;

      // Send rejection webhook to REGISTRATION webhook with full info
      const embed = {
        title: "❌ تم رفض طلب توظيف",
        color: 0xef4444,
        fields: [
          { name: "👤 اسم الحساب", value: selectedApplication.account_name, inline: true },
          { name: "🎮 اسم الشخصية", value: selectedApplication.character_name, inline: true },
          { name: "💬 يوزر الديسكورد", value: selectedApplication.discord_username, inline: true },
          { name: "⭐ الفل", value: selectedApplication.level, inline: true },
          { name: "🆔 الايدي", value: selectedApplication.game_id, inline: true },
          ...(rejectionReason ? [{ name: "📝 سبب الرفض", value: rejectionReason, inline: false }] : []),
          { name: "🛡️ المشرف المسؤول", value: adminDiscord || "غير محدد", inline: false },
        ],
        timestamp: new Date().toISOString(),
        footer: { text: "Walker Family Shop" },
      };

      await fetch(DISCORD_REGISTRATION_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embeds: [embed] }),
      });

      const rejectedApp = { ...selectedApplication, status: "rejected", rejection_reason: rejectionReason || null, processed_at: new Date().toISOString(), handled_by_email: adminEmail, handled_by_discord: adminDiscord };
      setApplications(applications.filter(app => app.id !== selectedApplication.id));
      setProcessedApplications(prev => [rejectedApp as JobApplication, ...prev]);
      setRejectDialogOpen(false);
      setRejectionReason("");

      toast({
        title: "تم رفض الطلب",
        description: `تم رفض طلب ${selectedApplication.discord_username}`,
      });
    } catch (error) {
      console.error("Error rejecting application:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء رفض الطلب",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Recruitment Toggle */}
      <Card className="bg-card/80 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            إعدادات التوظيف
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base">حالة التوظيف</Label>
              <p className="text-sm text-muted-foreground">
                {isRecruitmentOpen ? "التوظيف مفتوح حالياً" : "التوظيف مغلق حالياً"}
              </p>
            </div>
            <Switch
              checked={isRecruitmentOpen}
              onCheckedChange={toggleRecruitment}
            />
          </div>
        </CardContent>
      </Card>

      {/* Pending Applications */}
      <Card className="bg-card/80 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            طلبات التوظيف المعلقة
            {applications.length > 0 && (
              <Badge variant="secondary" className="mr-2">
                {applications.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              لا توجد طلبات معلقة
            </p>
          ) : (
            <div className="space-y-4">
              {applications.map((application) => (
                <Card key={application.id} className="bg-background/50">
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 flex-1">
                        <div>
                          <p className="text-xs text-muted-foreground">اسم الحساب</p>
                          <p className="font-medium">{application.account_name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">اسم الشخصية</p>
                          <p className="font-medium">{application.character_name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">الديسكورد</p>
                          <p className="font-medium">{application.discord_username}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">الفل</p>
                          <p className="font-medium">{application.level}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">الايدي</p>
                          <p className="font-medium">{application.game_id}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => openAcceptDialog(application)}
                          disabled={processingId === application.id}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {processingId === application.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="w-4 h-4 ml-1" />
                              قبول
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => openRejectDialog(application)}
                          disabled={processingId === application.id}
                        >
                          <X className="w-4 h-4 ml-1" />
                          رفض
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processed Applications History */}
      <Card className="bg-card/80 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="w-5 h-5" />
            سجل الطلبات
            {processedApplications.length > 0 && (
              <Badge variant="secondary" className="mr-2">
                {processedApplications.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {processedApplications.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              لا توجد طلبات سابقة
            </p>
          ) : (
            <div className="space-y-3">
              {processedApplications.map((app) => (
                <Card key={app.id} className="bg-background/50">
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={app.status === "accepted" ? "default" : "destructive"}>
                            {app.status === "accepted" ? "✅ مقبول" : "❌ مرفوض"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {app.processed_at ? new Date(app.processed_at).toLocaleDateString("ar-SA") : ""}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground">اسم الحساب</p>
                          <p className="font-medium text-sm">{app.account_name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">اسم الشخصية</p>
                          <p className="font-medium text-sm">{app.character_name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">الديسكورد</p>
                          <p className="font-medium text-sm">{app.discord_username}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">الفل</p>
                          <p className="font-medium text-sm">{app.level}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">الايدي</p>
                          <p className="font-medium text-sm">{app.game_id}</p>
                        </div>
                      </div>
                      {app.status === "rejected" && app.rejection_reason && (
                        <div className="bg-destructive/10 rounded p-2">
                          <p className="text-xs text-muted-foreground">سبب الرفض</p>
                          <p className="text-sm">{app.rejection_reason}</p>
                        </div>
                      )}
                      {(app.handled_by_discord || app.handled_by_email) && (
                        <p className="text-xs text-muted-foreground">
                          بواسطة: {app.handled_by_discord || app.handled_by_email}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Accept Dialog */}
      <Dialog open={acceptDialogOpen} onOpenChange={setAcceptDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>قبول طلب التوظيف</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              سيتم إنشاء حساب للموظف {selectedApplication?.discord_username} مع الرول المحدد
            </p>
            <div className="space-y-2">
              <Label>اختر الرول</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الرول" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAcceptDialogOpen(false)}>
              إلغاء
            </Button>
            <Button
              onClick={handleAccept}
              disabled={!selectedRole || processingId !== null}
              className="bg-green-600 hover:bg-green-700"
            >
              {processingId ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4 ml-1" />
                  تأكيد القبول
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>رفض طلب التوظيف</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              سيتم رفض طلب {selectedApplication?.discord_username}
            </p>
            <div className="space-y-2">
              <Label>سبب الرفض (اختياري)</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="أدخل سبب الرفض..."
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              إلغاء
            </Button>
            <Button
              onClick={handleReject}
              disabled={processingId !== null}
              variant="destructive"
            >
              {processingId ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <X className="w-4 h-4 ml-1" />
                  تأكيد الرفض
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RecruitmentTab;
