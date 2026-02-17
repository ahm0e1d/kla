import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, GripVertical, Save, Palette, Sparkles, Home, Package, ShoppingCart, ScrollText, MessageCircle, Image, Type, Paintbrush, Music, Video, Link2, Settings } from "lucide-react";
import { motion, Reorder } from "framer-motion";

interface NavItem {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: "home", name: "الرئيسية", icon: Home },
  { id: "products", name: "المنتجات", icon: Package },
  { id: "cart", name: "السلة", icon: ShoppingCart },
  { id: "rules", name: "القوانين", icon: ScrollText },
  { id: "contact", name: "تواصل معنا", icon: MessageCircle },
];

const ADMIN_TAB_ITEMS = [
  { id: "products", name: "المنتجات" },
  { id: "orders", name: "الطلبات" },
  { id: "users", name: "التسجيلات" },
  { id: "approved-users", name: "المفعلين" },
  { id: "blacklist", name: "الموقوفين" },
  { id: "admins", name: "الأدمنية" },
  { id: "roles", name: "الرولات" },
  { id: "credentials", name: "كلمات السر" },
  { id: "recruitment", name: "التوظيف" },
  { id: "staff-affairs", name: "شؤون البائعين" },
  { id: "staff-service", name: "تسجيل الخدمة" },
  { id: "working-hours", name: "أوقات العمل" },
  { id: "rules", name: "القوانين" },
  { id: "appearance", name: "المظهر" },
  { id: "announcements", name: "الإعلانات" },
];

const TRANSITIONS = [
  { id: "slide", name: "انزلاق", description: "انتقال انزلاقي سلس" },
  { id: "fade", name: "تلاشي", description: "ظهور وإخفاء تدريجي" },
  { id: "scale", name: "تكبير", description: "تكبير وتصغير" },
  { id: "flip", name: "قلب", description: "تأثير قلب ثلاثي الأبعاد" },
  { id: "slide-up", name: "انزلاق للأعلى", description: "انزلاق من الأسفل للأعلى" },
  { id: "zoom", name: "تقريب", description: "تأثير تقريب مع تلاشي" },
  { id: "rotate", name: "دوران", description: "دوران مع ظهور" },
];

const THEME_COLORS = [
  { id: "red", name: "أحمر", primary: "0 72% 50%", accent: "45 100% 50%" },
  { id: "blue", name: "أزرق", primary: "220 70% 50%", accent: "180 100% 50%" },
  { id: "green", name: "أخضر", primary: "140 70% 40%", accent: "60 100% 50%" },
  { id: "purple", name: "بنفسجي", primary: "270 70% 50%", accent: "300 100% 60%" },
  { id: "orange", name: "برتقالي", primary: "25 90% 50%", accent: "45 100% 50%" },
  { id: "teal", name: "تركوازي", primary: "175 70% 40%", accent: "200 100% 50%" },
];

interface SiteAppearanceTabProps {
  adminEmail?: string;
}

const SiteAppearanceTab = ({ adminEmail }: SiteAppearanceTabProps) => {
  const [navOrder, setNavOrder] = useState<string[]>(["home", "products", "cart", "rules", "contact"]);
  const [transitionType, setTransitionType] = useState("slide");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shopName, setShopName] = useState("Walker Family Shop");
  const [logoUrl, setLogoUrl] = useState("");
  const [themeColor, setThemeColor] = useState("red");
  const [audioUrl, setAudioUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [discordFamilyUrl, setDiscordFamilyUrl] = useState("https://discord.gg/BuymXGjbdU");
  const [discordShopUrl, setDiscordShopUrl] = useState("https://discord.gg/xVntJmJZ2f");
  const [adminTabOrder, setAdminTabOrder] = useState<string[]>(ADMIN_TAB_ITEMS.map(i => i.id));
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("key, value");

      if (error) throw error;

      if (data) {
        data.forEach((setting: { key: string; value: unknown }) => {
          if (setting.key === "navbar_order" && Array.isArray(setting.value)) {
            setNavOrder(setting.value as string[]);
          }
          if (setting.key === "transition_type" && typeof setting.value === "string") {
            setTransitionType(setting.value);
          }
          if (setting.key === "shop_name" && typeof setting.value === "string") {
            setShopName(setting.value);
          }
          if (setting.key === "logo_url" && typeof setting.value === "string") {
            setLogoUrl(setting.value);
          }
          if (setting.key === "theme_color" && typeof setting.value === "string") {
            setThemeColor(setting.value);
          }
          if (setting.key === "audio_url" && typeof setting.value === "string") {
            setAudioUrl(setting.value);
          }
          if (setting.key === "video_url" && typeof setting.value === "string") {
            setVideoUrl(setting.value);
          }
          if (setting.key === "discord_family_url" && typeof setting.value === "string") {
            setDiscordFamilyUrl(setting.value);
          }
          if (setting.key === "discord_shop_url" && typeof setting.value === "string") {
            setDiscordShopUrl(setting.value);
          }
          if (setting.key === "admin_tab_order" && Array.isArray(setting.value)) {
            setAdminTabOrder(setting.value as string[]);
          }
        });
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `site/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      setLogoUrl(urlData.publicUrl);
      toast({
        title: "تم رفع الشعار",
        description: "تم رفع الشعار بنجاح. لا تنس حفظ الإعدادات."
      });
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast({
        title: "خطأ",
        description: "فشل في رفع الشعار",
        variant: "destructive"
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAudio(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `audio-${Date.now()}.${fileExt}`;
      const filePath = `site/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      setAudioUrl(urlData.publicUrl);
      toast({
        title: "تم رفع الصوت",
        description: "تم رفع الملف الصوتي بنجاح. لا تنس حفظ الإعدادات."
      });
    } catch (error) {
      console.error("Error uploading audio:", error);
      toast({
        title: "خطأ",
        description: "فشل في رفع الملف الصوتي",
        variant: "destructive"
      });
    } finally {
      setUploadingAudio(false);
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingVideo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `video-${Date.now()}.${fileExt}`;
      const filePath = `site/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      setVideoUrl(urlData.publicUrl);
      toast({
        title: "تم رفع الفيديو",
        description: "تم رفع الفيديو بنجاح. لا تنس حفظ الإعدادات."
      });
    } catch (error) {
      console.error("Error uploading video:", error);
      toast({
        title: "خطأ",
        description: "فشل في رفع الفيديو",
        variant: "destructive"
      });
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save navbar order
      await supabase.functions.invoke("manage-site-settings", {
        body: { 
          action: "update", 
          key: "navbar_order", 
          value: navOrder,
          admin_email: adminEmail
        }
      });

      // Save transition type
      await supabase.functions.invoke("manage-site-settings", {
        body: { 
          action: "update", 
          key: "transition_type", 
          value: transitionType,
          admin_email: adminEmail
        }
      });

      // Save shop name
      await supabase.functions.invoke("manage-site-settings", {
        body: { 
          action: "update", 
          key: "shop_name", 
          value: shopName,
          admin_email: adminEmail
        }
      });

      // Save logo URL
      await supabase.functions.invoke("manage-site-settings", {
        body: { 
          action: "update", 
          key: "logo_url", 
          value: logoUrl,
          admin_email: adminEmail
        }
      });

      // Save theme color
      await supabase.functions.invoke("manage-site-settings", {
        body: { 
          action: "update", 
          key: "theme_color", 
          value: themeColor,
          admin_email: adminEmail
        }
      });

      // Save audio URL
      await supabase.functions.invoke("manage-site-settings", {
        body: { 
          action: "update", 
          key: "audio_url", 
          value: audioUrl,
          admin_email: adminEmail
        }
      });

      // Save video URL
      await supabase.functions.invoke("manage-site-settings", {
        body: { 
          action: "update", 
          key: "video_url", 
          value: videoUrl,
          admin_email: adminEmail
        }
      });

      // Save discord family URL
      await supabase.functions.invoke("manage-site-settings", {
        body: { 
          action: "update", 
          key: "discord_family_url", 
          value: discordFamilyUrl,
          admin_email: adminEmail
        }
      });

      // Save discord shop URL
      await supabase.functions.invoke("manage-site-settings", {
        body: { 
          action: "update", 
          key: "discord_shop_url", 
          value: discordShopUrl,
          admin_email: adminEmail
        }
      });

      // Save admin tab order
      await supabase.functions.invoke("manage-site-settings", {
        body: { 
          action: "update", 
          key: "admin_tab_order", 
          value: adminTabOrder,
          admin_email: adminEmail
        }
      });

      toast({
        title: "تم الحفظ",
        description: "تم حفظ إعدادات المظهر بنجاح. أعد تحميل الصفحة لرؤية التغييرات."
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "خطأ",
        description: "فشل في حفظ الإعدادات",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const orderedItems = navOrder
    .map(id => NAV_ITEMS.find(item => item.id === id))
    .filter(Boolean) as NavItem[];

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Shop Branding */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="w-5 h-5" />
            هوية المتجر
          </CardTitle>
          <CardDescription>
            تعديل اسم المتجر والشعار
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>اسم المتجر</Label>
            <Input 
              value={shopName} 
              onChange={(e) => setShopName(e.target.value)}
              placeholder="أدخل اسم المتجر"
              className="bg-input border-border"
            />
          </div>
          <div>
            <Label>شعار المتجر</Label>
            <div className="flex items-center gap-4 mt-2">
              {logoUrl && (
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                </div>
              )}
              <div className="flex-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleLogoUpload}
                  accept="image/*"
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="w-full"
                >
                  {uploadingLogo ? (
                    <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  ) : (
                    <Image className="w-4 h-4 ml-2" />
                  )}
                  {logoUrl ? "تغيير الشعار" : "رفع شعار"}
                </Button>
              </div>
            </div>
            {logoUrl && (
              <Input 
                value={logoUrl} 
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="أو أدخل رابط الشعار"
                className="bg-input border-border mt-2"
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Theme Colors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Paintbrush className="w-5 h-5" />
            ثيم المتجر
          </CardTitle>
          <CardDescription>
            اختر لون الثيم الرئيسي للمتجر
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {THEME_COLORS.map((color) => (
              <button
                key={color.id}
                onClick={() => setThemeColor(color.id)}
                className={`relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                  themeColor === color.id 
                    ? "border-primary bg-primary/10" 
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div 
                  className="w-10 h-10 rounded-full"
                  style={{ backgroundColor: `hsl(${color.primary})` }}
                />
                <span className="text-xs font-medium">{color.name}</span>
                {themeColor === color.id && (
                  <motion.div
                    layoutId="theme-indicator"
                    className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full"
                  />
                )}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            * سيتم تطبيق الثيم فوراً عند الحفظ
          </p>
        </CardContent>
      </Card>

      {/* Background Audio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="w-5 h-5" />
            الصوت الخلفي (MP3)
          </CardTitle>
          <CardDescription>
            رفع ملف صوتي يشتغل في خلفية الموقع
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            {audioUrl && (
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                <Music className="w-8 h-8 text-primary" />
              </div>
            )}
            <div className="flex-1">
              <input
                type="file"
                ref={audioInputRef}
                onChange={handleAudioUpload}
                accept="audio/*"
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => audioInputRef.current?.click()}
                disabled={uploadingAudio}
                className="w-full"
              >
                {uploadingAudio ? (
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                ) : (
                  <Music className="w-4 h-4 ml-2" />
                )}
                {audioUrl ? "تغيير الصوت" : "رفع ملف صوتي"}
              </Button>
            </div>
          </div>
          {audioUrl && (
            <div className="space-y-2">
              <audio src={audioUrl} controls className="w-full" />
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => setAudioUrl("")}
                className="w-full"
              >
                إزالة الصوت
              </Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            * الصوت يشتغل في الخلفية بدون مربع مرئي
          </p>
        </CardContent>
      </Card>

      {/* Background Video */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            فيديو الخلفية
          </CardTitle>
          <CardDescription>
            رفع فيديو أو لصق رابط ليظهر في مربع صغير بالموقع
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload Video */}
          <div className="flex items-center gap-4">
            {videoUrl && (
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                <Video className="w-8 h-8 text-primary" />
              </div>
            )}
            <div className="flex-1">
              <input
                type="file"
                ref={videoInputRef}
                onChange={handleVideoUpload}
                accept="video/*"
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => videoInputRef.current?.click()}
                disabled={uploadingVideo}
                className="w-full"
              >
                {uploadingVideo ? (
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                ) : (
                  <Video className="w-4 h-4 ml-2" />
                )}
                {videoUrl ? "تغيير الفيديو" : "رفع فيديو من الجهاز"}
              </Button>
            </div>
          </div>
          
          {/* Or paste URL */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">أو</span>
            </div>
          </div>
          
          <div>
            <Label>رابط الفيديو</Label>
            <Input 
              value={videoUrl} 
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://example.com/video.mp4"
              className="bg-input border-border mt-2"
              dir="ltr"
            />
          </div>
          
          {videoUrl && (
            <div className="space-y-2">
              <div className="rounded-lg overflow-hidden bg-muted aspect-video max-w-xs">
                <video src={videoUrl} controls className="w-full h-full object-cover" />
              </div>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => setVideoUrl("")}
                className="w-full max-w-xs"
              >
                إزالة الفيديو
              </Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            * الفيديو يظهر في مربع صغير بالزاوية مع إمكانية التصغير/الإخفاء
          </p>
        </CardContent>
      </Card>

      {/* Discord Server URLs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            روابط سيرفرات الديسكورد
          </CardTitle>
          <CardDescription>
            تعديل روابط السيرفرات الموجودة في الصفحة الرئيسية
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>رابط سيرفر العائلة</Label>
            <Input 
              value={discordFamilyUrl} 
              onChange={(e) => setDiscordFamilyUrl(e.target.value)}
              placeholder="https://discord.gg/..."
              className="bg-input border-border mt-2"
              dir="ltr"
            />
          </div>
          <div>
            <Label>رابط سيرفر المتجر</Label>
            <Input 
              value={discordShopUrl} 
              onChange={(e) => setDiscordShopUrl(e.target.value)}
              placeholder="https://discord.gg/..."
              className="bg-input border-border mt-2"
              dir="ltr"
            />
          </div>
        </CardContent>
      </Card>

      {/* Admin Tabs Order */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            ترتيب أقسام لوحة الإدارة
          </CardTitle>
          <CardDescription>
            اسحب وأفلت لتغيير ترتيب الأقسام في لوحة التحكم
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Reorder.Group 
            axis="y" 
            values={adminTabOrder} 
            onReorder={setAdminTabOrder}
            className="space-y-2"
          >
            {adminTabOrder
              .map(id => ADMIN_TAB_ITEMS.find(item => item.id === id))
              .filter(Boolean)
              .map((item) => (
                <Reorder.Item
                  key={item!.id}
                  value={item!.id}
                  className="cursor-grab active:cursor-grabbing"
                >
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg border border-border hover:border-primary/50 transition-colors"
                  >
                    <GripVertical className="w-5 h-5 text-muted-foreground" />
                    <span className="font-medium">{item!.name}</span>
                  </motion.div>
                </Reorder.Item>
              ))}
          </Reorder.Group>
        </CardContent>
      </Card>

      {/* Navbar Order */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            ترتيب الشريط العلوي (Navbar)
          </CardTitle>
          <CardDescription>
            اسحب وأفلت لتغيير ترتيب العناصر في شريط التنقل العلوي
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Reorder.Group 
            axis="y" 
            values={navOrder} 
            onReorder={setNavOrder}
            className="space-y-2"
          >
            {orderedItems.map((item) => {
              const Icon = item.icon;
              return (
                <Reorder.Item
                  key={item.id}
                  value={item.id}
                  className="cursor-grab active:cursor-grabbing"
                >
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg border border-border hover:border-primary/50 transition-colors"
                  >
                    <GripVertical className="w-5 h-5 text-muted-foreground" />
                    <Icon className="w-5 h-5 text-primary" />
                    <span className="font-medium">{item.name}</span>
                  </motion.div>
                </Reorder.Item>
              );
            })}
          </Reorder.Group>
          
          {/* Preview */}
          <div className="mt-6 p-4 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground mb-3">معاينة الترتيب:</p>
            <div className="flex items-center gap-2 flex-wrap">
              {orderedItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 px-3 py-2 bg-background rounded-lg border"
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm">{item.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transition Type */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            نوع الانتقالات
          </CardTitle>
          <CardDescription>
            اختر تأثير الانتقال للصفحات
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>نوع الانتقال</Label>
            <Select value={transitionType} onValueChange={setTransitionType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRANSITIONS.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    <div className="flex flex-col">
                      <span>{t.name}</span>
                      <span className="text-xs text-muted-foreground">{t.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preview */}
          <div className="p-4 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground mb-3">معاينة التأثير:</p>
            <motion.div
              key={transitionType}
              initial={getInitialAnimation(transitionType)}
              animate={getAnimateAnimation(transitionType)}
              transition={{ duration: 0.5 }}
              className="w-full h-20 bg-primary/20 rounded-lg flex items-center justify-center"
            >
              <span className="text-primary font-medium">معاينة الانتقال</span>
            </motion.div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? (
          <Loader2 className="w-4 h-4 animate-spin ml-2" />
        ) : (
          <Save className="w-4 h-4 ml-2" />
        )}
        حفظ الإعدادات
      </Button>
    </div>
  );
};

function getInitialAnimation(type: string) {
  switch (type) {
    case "slide": return { x: -50, opacity: 0 };
    case "fade": return { opacity: 0 };
    case "scale": return { scale: 0.8, opacity: 0 };
    case "flip": return { rotateY: -90, opacity: 0 };
    case "slide-up": return { y: 50, opacity: 0 };
    case "zoom": return { scale: 0.5, opacity: 0 };
    case "rotate": return { rotate: -10, opacity: 0 };
    default: return { opacity: 0 };
  }
}

function getAnimateAnimation(type: string) {
  switch (type) {
    case "slide": return { x: 0, opacity: 1 };
    case "fade": return { opacity: 1 };
    case "scale": return { scale: 1, opacity: 1 };
    case "flip": return { rotateY: 0, opacity: 1 };
    case "slide-up": return { y: 0, opacity: 1 };
    case "zoom": return { scale: 1, opacity: 1 };
    case "rotate": return { rotate: 0, opacity: 1 };
    default: return { opacity: 1 };
  }
}

export default SiteAppearanceTab;
