import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Trash2, Edit2, Bell, AlertCircle, Info, CheckCircle, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
  is_active: boolean;
  created_at: string;
  created_by: string;
  expires_at: string | null;
}

const ANNOUNCEMENT_TYPES = [
  { id: "info", name: "معلومة", icon: Info, color: "bg-blue-500" },
  { id: "success", name: "نجاح", icon: CheckCircle, color: "bg-green-500" },
  { id: "warning", name: "تحذير", icon: AlertTriangle, color: "bg-yellow-500" },
  { id: "error", name: "مهم", icon: AlertCircle, color: "bg-red-500" },
];

interface AnnouncementsTabProps {
  adminEmail?: string;
}

const AnnouncementsTab = ({ adminEmail }: AnnouncementsTabProps) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    type: "info",
    is_active: true,
    expires_at: ""
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("manage-announcements", {
        body: { action: "list" }
      });

      if (error) throw error;
      setAnnouncements(data.announcements || []);
    } catch (error) {
      console.error("Error fetching announcements:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const action = editingAnnouncement ? "update" : "create";
      const body: Record<string, unknown> = {
        action,
        ...formData,
        expires_at: formData.expires_at || null,
        admin_email: adminEmail
      };

      if (editingAnnouncement) {
        body.id = editingAnnouncement.id;
      }

      const { data, error } = await supabase.functions.invoke("manage-announcements", {
        body
      });

      if (error) throw error;

      toast({
        title: editingAnnouncement ? "تم التحديث" : "تم الإنشاء",
        description: editingAnnouncement ? "تم تحديث الإعلان بنجاح" : "تم إنشاء الإعلان بنجاح"
      });

      setDialogOpen(false);
      resetForm();
      fetchAnnouncements();
    } catch (error) {
      console.error("Error saving announcement:", error);
      toast({
        title: "خطأ",
        description: "فشل في حفظ الإعلان",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الإعلان؟")) return;

    try {
      const { error } = await supabase.functions.invoke("manage-announcements", {
        body: { action: "delete", id }
      });

      if (error) throw error;

      toast({
        title: "تم الحذف",
        description: "تم حذف الإعلان بنجاح"
      });

      fetchAnnouncements();
    } catch (error) {
      console.error("Error deleting announcement:", error);
      toast({
        title: "خطأ",
        description: "فشل في حذف الإعلان",
        variant: "destructive"
      });
    }
  };

  const handleToggleActive = async (announcement: Announcement) => {
    try {
      const { error } = await supabase.functions.invoke("manage-announcements", {
        body: { 
          action: "update", 
          id: announcement.id,
          is_active: !announcement.is_active
        }
      });

      if (error) throw error;
      fetchAnnouncements();
    } catch (error) {
      console.error("Error toggling announcement:", error);
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      is_active: announcement.is_active,
      expires_at: announcement.expires_at ? announcement.expires_at.split("T")[0] : ""
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      type: "info",
      is_active: true,
      expires_at: ""
    });
    setEditingAnnouncement(null);
  };

  const getTypeConfig = (type: string) => {
    return ANNOUNCEMENT_TYPES.find(t => t.id === type) || ANNOUNCEMENT_TYPES[0];
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Bell className="w-5 h-5" />
            الإعلانات
          </h3>
          <p className="text-sm text-muted-foreground">
            إدارة الإعلانات التي تظهر للمستخدمين
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 ml-2" />
              إعلان جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingAnnouncement ? "تعديل الإعلان" : "إعلان جديد"}
              </DialogTitle>
              <DialogDescription>
                {editingAnnouncement ? "قم بتعديل بيانات الإعلان" : "أنشئ إعلان جديد لعرضه للمستخدمين"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>العنوان</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="عنوان الإعلان"
                />
              </div>
              <div className="space-y-2">
                <Label>المحتوى</Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="نص الإعلان"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>النوع</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ANNOUNCEMENT_TYPES.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        <div className="flex items-center gap-2">
                          <t.icon className="w-4 h-4" />
                          {t.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>تاريخ الانتهاء (اختياري)</Label>
                <Input
                  type="date"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>مفعّل</Label>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                {editingAnnouncement ? "تحديث" : "إنشاء"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Announcements List */}
      {announcements.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
            لا توجد إعلانات
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {announcements.map((announcement) => {
            const typeConfig = getTypeConfig(announcement.type);
            const TypeIcon = typeConfig.icon;
            
            return (
              <Card key={announcement.id} className={`${!announcement.is_active ? "opacity-60" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-2 rounded-full ${typeConfig.color}`}>
                        <TypeIcon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{announcement.title}</h4>
                          {!announcement.is_active && (
                            <Badge variant="secondary">غير مفعّل</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{announcement.content}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>بواسطة: {announcement.created_by}</span>
                          {announcement.expires_at && (
                            <span>ينتهي: {new Date(announcement.expires_at).toLocaleDateString("ar")}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={announcement.is_active}
                        onCheckedChange={() => handleToggleActive(announcement)}
                      />
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(announcement)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(announcement.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AnnouncementsTab;
