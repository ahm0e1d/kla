import { useState, useEffect } from "react";
import { Clock, Save, Loader2, Bell, Store, Calendar, Power, Palmtree, MessageSquare, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useStoreStatus } from "@/hooks/useStoreStatus";

interface WorkingHoursTabProps {
  adminEmail?: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "الأحد", shortLabel: "أحد" },
  { value: 1, label: "الإثنين", shortLabel: "إثن" },
  { value: 2, label: "الثلاثاء", shortLabel: "ثلث" },
  { value: 3, label: "الأربعاء", shortLabel: "أرب" },
  { value: 4, label: "الخميس", shortLabel: "خمس" },
  { value: 5, label: "الجمعة", shortLabel: "جمع" },
  { value: 6, label: "السبت", shortLabel: "سبت" },
];

const WorkingHoursTab = ({ adminEmail }: WorkingHoursTabProps) => {
  const { toast } = useToast();
  const { 
    isOpen, 
    storeHours, 
    loading: statusLoading, 
    isVacation, 
    vacationMessage: savedVacationMessage,
    customDiscordMessage: savedDiscordMessage
  } = useStoreStatus();
  
  const [openTime, setOpenTime] = useState("08:00");
  const [closeTime, setCloseTime] = useState("22:00");
  const [workingDays, setWorkingDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [saving, setSaving] = useState(false);
  const [sendingWebhook, setSendingWebhook] = useState(false);
  const [lastSentStatus, setLastSentStatus] = useState<boolean | null>(null);
  
  // Shift system states
  const [morningShiftEnabled, setMorningShiftEnabled] = useState(true);
  const [morningShiftStart, setMorningShiftStart] = useState("08:00");
  const [morningShiftEnd, setMorningShiftEnd] = useState("14:00");
  const [eveningShiftEnabled, setEveningShiftEnabled] = useState(true);
  const [eveningShiftStart, setEveningShiftStart] = useState("16:00");
  const [eveningShiftEnd, setEveningShiftEnd] = useState("22:00");
  const [savingMorningShift, setSavingMorningShift] = useState(false);
  const [savingEveningShift, setSavingEveningShift] = useState(false);
  
  // Vacation states
  const [vacationMode, setVacationMode] = useState(false);
  const [vacationMessage, setVacationMessage] = useState("المتجر في عطلة 🏖️ سنعود قريباً!");
  const [discordMessage, setDiscordMessage] = useState("");
  const [savingVacation, setSavingVacation] = useState(false);
  const [savingDiscord, setSavingDiscord] = useState(false);

  // Fetch shift settings
  const fetchShiftSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .in("key", [
          "morning_shift_enabled",
          "morning_shift_start",
          "morning_shift_end",
          "evening_shift_enabled",
          "evening_shift_start",
          "evening_shift_end"
        ]);

      if (error) throw error;

      data?.forEach((setting: { key: string; value: unknown }) => {
        if (setting.key === "morning_shift_enabled") {
          setMorningShiftEnabled(setting.value as boolean);
        } else if (setting.key === "morning_shift_start") {
          setMorningShiftStart(setting.value as string);
        } else if (setting.key === "morning_shift_end") {
          setMorningShiftEnd(setting.value as string);
        } else if (setting.key === "evening_shift_enabled") {
          setEveningShiftEnabled(setting.value as boolean);
        } else if (setting.key === "evening_shift_start") {
          setEveningShiftStart(setting.value as string);
        } else if (setting.key === "evening_shift_end") {
          setEveningShiftEnd(setting.value as string);
        }
      });
    } catch (error) {
      console.error("Error fetching shift settings:", error);
    }
  };

  useEffect(() => {
    fetchShiftSettings();
  }, []);

  useEffect(() => {
    if (storeHours) {
      setOpenTime(storeHours.openTime);
      setCloseTime(storeHours.closeTime);
      if (storeHours.workingDays) {
        setWorkingDays(storeHours.workingDays);
      }
    }
  }, [storeHours]);

  useEffect(() => {
    setVacationMode(isVacation);
    if (savedVacationMessage) {
      setVacationMessage(savedVacationMessage);
    }
    if (savedDiscordMessage) {
      setDiscordMessage(savedDiscordMessage);
    }
  }, [isVacation, savedVacationMessage, savedDiscordMessage]);

  const toggleDay = (day: number) => {
    setWorkingDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save open time
      await supabase.functions.invoke("manage-site-settings", {
        body: {
          action: "update",
          key: "store_open_time",
          value: openTime,
          admin_email: adminEmail,
        },
      });

      // Save close time
      await supabase.functions.invoke("manage-site-settings", {
        body: {
          action: "update",
          key: "store_close_time",
          value: closeTime,
          admin_email: adminEmail,
        },
      });

      // Save working days
      await supabase.functions.invoke("manage-site-settings", {
        body: {
          action: "update",
          key: "store_working_days",
          value: workingDays,
          admin_email: adminEmail,
        },
      });

      toast({
        title: "تم الحفظ",
        description: "تم حفظ أوقات وأيام العمل بنجاح",
      });
    } catch (error) {
      console.error("Error saving working hours:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حفظ الإعدادات",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleMorningShift = async () => {
    setSavingMorningShift(true);
    const newValue = !morningShiftEnabled;
    try {
      await supabase.functions.invoke("manage-site-settings", {
        body: {
          action: "update",
          key: "morning_shift_enabled",
          value: newValue,
          admin_email: adminEmail,
        },
      });

      setMorningShiftEnabled(newValue);
      
      // Send webhook
      await sendStatusWebhook();
      
      toast({
        title: newValue ? "تم تشغيل الشفت الصباحي" : "تم إيقاف الشفت الصباحي",
      });
    } catch (error) {
      console.error("Error toggling morning shift:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تغيير حالة الشفت",
        variant: "destructive",
      });
    } finally {
      setSavingMorningShift(false);
    }
  };

  const handleToggleEveningShift = async () => {
    setSavingEveningShift(true);
    const newValue = !eveningShiftEnabled;
    try {
      await supabase.functions.invoke("manage-site-settings", {
        body: {
          action: "update",
          key: "evening_shift_enabled",
          value: newValue,
          admin_email: adminEmail,
        },
      });

      setEveningShiftEnabled(newValue);
      
      // Send webhook
      await sendStatusWebhook();
      
      toast({
        title: newValue ? "تم تشغيل الشفت المسائي" : "تم إيقاف الشفت المسائي",
      });
    } catch (error) {
      console.error("Error toggling evening shift:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تغيير حالة الشفت",
        variant: "destructive",
      });
    } finally {
      setSavingEveningShift(false);
    }
  };

  const handleSaveMorningShiftTimes = async () => {
    setSavingMorningShift(true);
    try {
      await supabase.functions.invoke("manage-site-settings", {
        body: { action: "update", key: "morning_shift_start", value: morningShiftStart, admin_email: adminEmail },
      });
      await supabase.functions.invoke("manage-site-settings", {
        body: { action: "update", key: "morning_shift_end", value: morningShiftEnd, admin_email: adminEmail },
      });
      toast({ title: "تم الحفظ", description: "تم حفظ أوقات الشفت الصباحي" });
    } catch (error) {
      toast({ title: "خطأ", description: "حدث خطأ", variant: "destructive" });
    } finally {
      setSavingMorningShift(false);
    }
  };

  const handleSaveEveningShiftTimes = async () => {
    setSavingEveningShift(true);
    try {
      await supabase.functions.invoke("manage-site-settings", {
        body: { action: "update", key: "evening_shift_start", value: eveningShiftStart, admin_email: adminEmail },
      });
      await supabase.functions.invoke("manage-site-settings", {
        body: { action: "update", key: "evening_shift_end", value: eveningShiftEnd, admin_email: adminEmail },
      });
      toast({ title: "تم الحفظ", description: "تم حفظ أوقات الشفت المسائي" });
    } catch (error) {
      toast({ title: "خطأ", description: "حدث خطأ", variant: "destructive" });
    } finally {
      setSavingEveningShift(false);
    }
  };

  const handleToggleVacation = async () => {
    setSavingVacation(true);
    const newValue = !vacationMode;
    try {
      // Save vacation mode
      await supabase.functions.invoke("manage-site-settings", {
        body: {
          action: "update",
          key: "store_vacation_mode",
          value: newValue,
          admin_email: adminEmail,
        },
      });

      // Save vacation message
      await supabase.functions.invoke("manage-site-settings", {
        body: {
          action: "update",
          key: "store_vacation_message",
          value: vacationMessage,
          admin_email: adminEmail,
        },
      });

      setVacationMode(newValue);
      
      // Send webhook - vacation only shows vacation message
      await sendStatusWebhook(!newValue && (morningShiftEnabled || eveningShiftEnabled), newValue);
      
      toast({
        title: newValue ? "تم تفعيل وضع العطلة" : "تم إلغاء وضع العطلة",
        description: newValue ? "المتجر في عطلة الآن" : "المتجر عاد للعمل",
      });
    } catch (error) {
      console.error("Error toggling vacation:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تغيير وضع العطلة",
        variant: "destructive",
      });
    } finally {
      setSavingVacation(false);
    }
  };

  const handleSaveDiscordMessage = async () => {
    setSavingDiscord(true);
    try {
      await supabase.functions.invoke("manage-site-settings", {
        body: {
          action: "update",
          key: "store_discord_message",
          value: discordMessage,
          admin_email: adminEmail,
        },
      });

      toast({
        title: "تم الحفظ",
        description: "تم حفظ رسالة الديسكورد بنجاح",
      });
    } catch (error) {
      console.error("Error saving discord message:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حفظ الرسالة",
        variant: "destructive",
      });
    } finally {
      setSavingDiscord(false);
    }
  };

  const sendStatusWebhook = async (storeIsOpen?: boolean, isVacationMode?: boolean) => {
    setSendingWebhook(true);
    try {
      const workingDaysNames = workingDays
        .map(d => DAYS_OF_WEEK.find(day => day.value === d)?.label)
        .filter(Boolean)
        .join("، ");

      const { error } = await supabase.functions.invoke("store-status-webhook", {
        body: {
          isOpen: storeIsOpen ?? isOpen,
          openTime,
          closeTime,
          workingDays: workingDaysNames,
          isVacation: isVacationMode ?? vacationMode,
          vacationMessage: vacationMessage,
          customMessage: discordMessage,
          morningShiftEnabled,
          morningShiftStart,
          morningShiftEnd,
          eveningShiftEnabled,
          eveningShiftStart,
          eveningShiftEnd,
        },
      });

      if (error) throw error;

      setLastSentStatus(storeIsOpen ?? isOpen);
      toast({
        title: "تم الإرسال",
        description: `تم إرسال حالة المتجر إلى Discord`,
      });
    } catch (error) {
      console.error("Error sending webhook:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إرسال الإشعار",
        variant: "destructive",
      });
    } finally {
      setSendingWebhook(false);
    }
  };

  // Auto-send webhook when status changes
  useEffect(() => {
    if (!statusLoading && lastSentStatus !== null && lastSentStatus !== isOpen) {
      sendStatusWebhook();
    }
  }, [isOpen, statusLoading]);

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const period = hour >= 12 ? "مساءً" : "صباحاً";
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${period}`;
  };

  const getTodayName = () => {
    const today = new Date().getDay();
    return DAYS_OF_WEEK.find(d => d.value === today)?.label || "";
  };

  const isTodayWorkingDay = workingDays.includes(new Date().getDay());

  const getStoreStatusText = () => {
    if (vacationMode) return "🏖️ في عطلة";
    if (!morningShiftEnabled && !eveningShiftEnabled) return "⏸️ الشفتات متوقفة";
    return isOpen ? "🟢 مفتوح" : "🔴 مغلق";
  };

  const getStoreStatusColor = () => {
    if (vacationMode) return "border-yellow-500/50 bg-yellow-500/5";
    if (!morningShiftEnabled && !eveningShiftEnabled) return "border-orange-500/50 bg-orange-500/5";
    return isOpen ? "border-green-500/50 bg-green-500/5" : "border-red-500/50 bg-red-500/5";
  };

  return (
    <div className="space-y-6">
      {/* Current Status Card */}
      <Card className={`border-2 ${getStoreStatusColor()}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Store className="w-6 h-6" />
            حالة المتجر الحالية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full animate-pulse ${
                  vacationMode ? "bg-yellow-500" : 
                  (!morningShiftEnabled && !eveningShiftEnabled) ? "bg-orange-500" :
                  isOpen ? "bg-green-500" : "bg-red-500"
                }`} />
                <Badge 
                  variant={isOpen && !vacationMode && (morningShiftEnabled || eveningShiftEnabled) ? "default" : "destructive"} 
                  className="text-lg px-4 py-2"
                >
                  {getStoreStatusText()}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                اليوم: {getTodayName()} {isTodayWorkingDay ? "(يوم عمل)" : "(إجازة)"}
              </p>
            </div>
            <Button
              onClick={() => sendStatusWebhook()}
              disabled={sendingWebhook}
              variant="outline"
              className="gap-2"
            >
              {sendingWebhook ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Bell className="w-4 h-4" />
              )}
              إرسال إشعار Discord
            </Button>
          </div>
          {storeHours && !vacationMode && (morningShiftEnabled || eveningShiftEnabled) && (
            <div className="text-muted-foreground mt-3 space-y-1">
              {morningShiftEnabled && (
                <p>☀️ الشفت الصباحي: من {formatTime(morningShiftStart)} إلى {formatTime(morningShiftEnd)}</p>
              )}
              {eveningShiftEnabled && (
                <p>🌙 الشفت المسائي: من {formatTime(eveningShiftStart)} إلى {formatTime(eveningShiftEnd)}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shift System - Morning & Evening */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Morning Shift */}
        <Card className={`border-2 ${morningShiftEnabled ? "border-amber-500/30" : "border-muted"}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="w-5 h-5 text-amber-500" />
              الشفت الصباحي
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">حالة الشفت</p>
                <p className="text-sm text-muted-foreground">
                  {morningShiftEnabled ? "مفعل" : "متوقف"}
                </p>
              </div>
              <Switch
                checked={morningShiftEnabled}
                onCheckedChange={handleToggleMorningShift}
                disabled={savingMorningShift}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">البداية</Label>
                <Input
                  type="time"
                  value={morningShiftStart}
                  onChange={(e) => setMorningShiftStart(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">النهاية</Label>
                <Input
                  type="time"
                  value={morningShiftEnd}
                  onChange={(e) => setMorningShiftEnd(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
            
            <Button
              onClick={handleSaveMorningShiftTimes}
              disabled={savingMorningShift}
              variant="outline"
              size="sm"
              className="w-full gap-2"
            >
              {savingMorningShift ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              حفظ الأوقات
            </Button>
          </CardContent>
        </Card>

        {/* Evening Shift */}
        <Card className={`border-2 ${eveningShiftEnabled ? "border-indigo-500/30" : "border-muted"}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Moon className="w-5 h-5 text-indigo-500" />
              الشفت المسائي
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">حالة الشفت</p>
                <p className="text-sm text-muted-foreground">
                  {eveningShiftEnabled ? "مفعل" : "متوقف"}
                </p>
              </div>
              <Switch
                checked={eveningShiftEnabled}
                onCheckedChange={handleToggleEveningShift}
                disabled={savingEveningShift}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">البداية</Label>
                <Input
                  type="time"
                  value={eveningShiftStart}
                  onChange={(e) => setEveningShiftStart(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">النهاية</Label>
                <Input
                  type="time"
                  value={eveningShiftEnd}
                  onChange={(e) => setEveningShiftEnd(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
            
            <Button
              onClick={handleSaveEveningShiftTimes}
              disabled={savingEveningShift}
              variant="outline"
              size="sm"
              className="w-full gap-2"
            >
              {savingEveningShift ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              حفظ الأوقات
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Vacation Control */}
      <Card className={`border-2 ${vacationMode ? "border-yellow-500/30" : "border-muted"}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palmtree className="w-5 h-5" />
            وضع العطلة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">وضع العطلة</p>
              <p className="text-sm text-muted-foreground">
                {vacationMode ? "المتجر في عطلة - لن تظهر أوقات العمل" : "المتجر يعمل بشكل طبيعي"}
              </p>
            </div>
            <Switch
              checked={vacationMode}
              onCheckedChange={handleToggleVacation}
              disabled={savingVacation}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vacationMessage">رسالة العطلة (فقط هذه ستظهر في الديسكورد)</Label>
            <Input
              id="vacationMessage"
              value={vacationMessage}
              onChange={(e) => setVacationMessage(e.target.value)}
              placeholder="رسالة تظهر للعملاء أثناء العطلة"
            />
          </div>
          <Button
            onClick={handleToggleVacation}
            disabled={savingVacation}
            variant={vacationMode ? "default" : "secondary"}
            className="w-full gap-2"
          >
            {savingVacation ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Palmtree className="w-4 h-4" />
            )}
            {vacationMode ? "إنهاء العطلة" : "تفعيل العطلة"}
          </Button>
        </CardContent>
      </Card>

      {/* Discord Message Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            رسالة الديسكورد المخصصة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="discordMessage">رسالة إضافية تظهر في إشعارات الديسكورد</Label>
            <Textarea
              id="discordMessage"
              value={discordMessage}
              onChange={(e) => setDiscordMessage(e.target.value)}
              placeholder="اكتب رسالة مخصصة تظهر مع إشعارات حالة المتجر..."
              rows={3}
            />
          </div>
          <Button
            onClick={handleSaveDiscordMessage}
            disabled={savingDiscord}
            variant="outline"
            className="gap-2"
          >
            {savingDiscord ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            حفظ الرسالة
          </Button>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>• <strong>الشفت الصباحي:</strong> تحكم بوقت العمل الصباحي بشكل منفصل</p>
            <p>• <strong>الشفت المسائي:</strong> تحكم بوقت العمل المسائي بشكل منفصل</p>
            <p>• <strong>وضع العطلة:</strong> يغلق المتجر ويظهر فقط رسالة العطلة (بدون أوقات العمل)</p>
            <p>• <strong>رسالة الديسكورد:</strong> تظهر مع كل إشعار حالة المتجر</p>
            <p>• المتجر يبقى مفتوح بين الشفتين (من نهاية الصباحي لبداية المسائي)</p>
            <p>• سيتم إرسال إشعار Discord تلقائياً عند تغيير الحالة</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkingHoursTab;