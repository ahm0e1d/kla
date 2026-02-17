import { useState, useEffect } from "react";
import { Plus, Save, Trash2, Edit2, Loader2, Shield, Settings, UserPlus, RefreshCw, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { sendRoleCreatedWebhook } from "@/lib/webhooks";

interface CustomRole {
  id: string;
  name: string;
  permissions: string[];
  created_at: string;
  created_by?: string;
}

interface ApprovedUser {
  id: string;
  email: string;
  discord_username: string;
  created_at: string;
}

interface UserCustomRole {
  id: string;
  user_id: string;
  role_id: string;
  assigned_at: string;
  assigned_by?: string;
}

interface RolesTabProps {
  adminEmail?: string;
}

const ADMIN_SECTIONS = [
  { id: "products", name: "المنتجات", icon: "📦" },
  { id: "orders", name: "الطلبات", icon: "🛒" },
  { id: "view_all_orders", name: "رؤية جميع الطلبات المستلمة", icon: "👁️" },
  { id: "users", name: "التسجيلات", icon: "👤" },
  { id: "approved-users", name: "المفعلين", icon: "✅" },
  { id: "blacklist", name: "الموقوفين", icon: "🚫" },
  { id: "admins", name: "الأدمنية", icon: "🛡️" },
  { id: "rules", name: "القوانين", icon: "📜" },
  { id: "appearance", name: "المظهر", icon: "🎨" },
  { id: "announcements", name: "الإعلانات", icon: "🔔" },
  { id: "roles", name: "الرولات", icon: "👑" },
  { id: "credentials", name: "كلمات السر", icon: "🔑" },
  { id: "working-hours", name: "أوقات العمل", icon: "⏰" },
  { id: "staff-service", name: "تسجيل الخدمة", icon: "👷" },
  { id: "recruitment", name: "التوظيف", icon: "💼" },
  { id: "staff-affairs", name: "شؤون البائعين", icon: "👔" },
];

const RolesTab = ({ adminEmail }: RolesTabProps) => {
  const { toast } = useToast();
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [users, setUsers] = useState<ApprovedUser[]>([]);
  const [userRoles, setUserRoles] = useState<UserCustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  
  const [roleName, setRoleName] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  // User role management
  const [isUserRoleDialogOpen, setIsUserRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ApprovedUser | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rolesRes, usersRes, userRolesRes] = await Promise.all([
        supabase.from("custom_roles").select("*").order("created_at", { ascending: false }),
        supabase.from("approved_users").select("id, email, discord_username, created_at").order("created_at", { ascending: false }),
        supabase.from("user_custom_roles").select("*")
      ]);

      if (rolesRes.error) throw rolesRes.error;
      if (usersRes.error) throw usersRes.error;
      if (userRolesRes.error) throw userRolesRes.error;
      
      const transformedRoles = (rolesRes.data || []).map(role => ({
        ...role,
        permissions: Array.isArray(role.permissions) ? role.permissions as string[] : []
      }));
      
      setRoles(transformedRoles);
      setUsers(usersRes.data || []);
      setUserRoles(userRolesRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحميل البيانات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!roleName.trim()) {
      toast({
        title: "خطأ",
        description: "الرجاء إدخال اسم الرول",
        variant: "destructive",
      });
      return;
    }

    if (selectedPermissions.length === 0) {
      toast({
        title: "خطأ",
        description: "الرجاء اختيار صلاحية واحدة على الأقل",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      if (editingRole) {
        const { data, error } = await supabase
          .from("custom_roles")
          .update({ 
            name: roleName, 
            permissions: selectedPermissions 
          })
          .eq("id", editingRole.id)
          .select();
        
        if (error) throw error;
        
        // Update local state immediately
        setRoles(prev => prev.map(r => 
          r.id === editingRole.id 
            ? { ...r, name: roleName, permissions: selectedPermissions }
            : r
        ));
        
        toast({ title: "تم!", description: "تم تحديث الرول بنجاح" });
      } else {
        const { data, error } = await supabase
          .from("custom_roles")
          .insert({ 
            name: roleName, 
            permissions: selectedPermissions,
            created_by: adminEmail 
          })
          .select();
        
        if (error) throw error;
        
        // Add new role to local state
        if (data && data.length > 0) {
          const newRole = {
            ...data[0],
            permissions: Array.isArray(data[0].permissions) ? data[0].permissions as string[] : []
          };
          setRoles(prev => [newRole, ...prev]);
          
          // Send Discord webhook
          const permissionNames = selectedPermissions.map(p => {
            const section = ADMIN_SECTIONS.find(s => s.id === p);
            return section?.name || p;
          });
          sendRoleCreatedWebhook({
            roleName,
            permissions: permissionNames,
            createdBy: adminEmail || "غير معروف"
          });
        }
        
        toast({ title: "تم!", description: "تم إضافة الرول بنجاح" });
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error("Error saving role:", error);
      toast({
        title: "خطأ",
        description: error.message?.includes("duplicate") ? "اسم الرول موجود مسبقاً" : "حدث خطأ أثناء الحفظ",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (roleId: string) => {
    try {
      const { error } = await supabase
        .from("custom_roles")
        .delete()
        .eq("id", roleId);

      if (error) throw error;
      toast({ title: "تم!", description: "تم حذف الرول بنجاح" });
      fetchData();
    } catch (error) {
      console.error("Error deleting role:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء الحذف",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (role: CustomRole) => {
    setEditingRole(role);
    setRoleName(role.name);
    setSelectedPermissions(role.permissions);
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setRoleName("");
    setSelectedPermissions([]);
    setEditingRole(null);
  };

  const togglePermission = (permissionId: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permissionId)
        ? prev.filter(p => p !== permissionId)
        : [...prev, permissionId]
    );
  };

  const getUserRoles = (userId: string) => {
    const userRoleIds = userRoles.filter(ur => ur.user_id === userId).map(ur => ur.role_id);
    return roles.filter(r => userRoleIds.includes(r.id));
  };

  const openUserRoleDialog = (user: ApprovedUser) => {
    setSelectedUser(user);
    setSelectedRoleId("");
    setIsUserRoleDialogOpen(true);
  };

  const handleAssignRole = async () => {
    if (!selectedUser || !selectedRoleId) {
      toast({
        title: "خطأ",
        description: "الرجاء اختيار رول",
        variant: "destructive",
      });
      return;
    }

    setAssigning(true);
    try {
      const { error } = await supabase
        .from("user_custom_roles")
        .insert({
          user_id: selectedUser.id,
          role_id: selectedRoleId,
          assigned_by: adminEmail
        });

      if (error) {
        if (error.message.includes("duplicate")) {
          toast({
            title: "تنبيه",
            description: "هذا الرول مُسند للمستخدم مسبقاً",
            variant: "destructive",
          });
          return;
        }
        throw error;
      }

      toast({ title: "تم!", description: "تم إسناد الرول بنجاح" });
      setIsUserRoleDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error assigning role:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إسناد الرول",
        variant: "destructive",
      });
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveUserRole = async (userId: string, roleId: string) => {
    try {
      const { error } = await supabase
        .from("user_custom_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role_id", roleId);

      if (error) throw error;
      toast({ title: "تم!", description: "تم إزالة الرول بنجاح" });
      fetchData();
    } catch (error) {
      console.error("Error removing role:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إزالة الرول",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="roles" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="roles" className="flex items-center gap-2">
          <Shield className="w-4 h-4" />
          إدارة الرولات
        </TabsTrigger>
        <TabsTrigger value="users" className="flex items-center gap-2">
          <User className="w-4 h-4" />
          تحكم بالمستخدمين
        </TabsTrigger>
      </TabsList>

      {/* Roles Management Tab */}
      <TabsContent value="roles" className="space-y-6">
        <div className="flex justify-between">
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className={`w-4 h-4 ml-2 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/80">
                <Plus className="w-5 h-5 ml-2" />
                إضافة رول
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingRole ? "تعديل الرول" : "إضافة رول جديد"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 mt-4">
                <div>
                  <Label>اسم الرول</Label>
                  <Input
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    placeholder="مثال: بائع"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label className="text-lg font-semibold mb-4 block">الصلاحيات</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {ADMIN_SECTIONS.map((section) => (
                      <Card 
                        key={section.id}
                        className={`cursor-pointer transition-all ${
                          selectedPermissions.includes(section.id) 
                            ? "border-primary bg-primary/10" 
                            : "hover:border-primary/50"
                        }`}
                        onClick={() => togglePermission(section.id)}
                      >
                        <CardContent className="p-4 flex items-center gap-3">
                          <Checkbox 
                            checked={selectedPermissions.includes(section.id)}
                            onCheckedChange={() => togglePermission(section.id)}
                          />
                          <span className="text-xl">{section.icon}</span>
                          <span className="font-medium">{section.name}</span>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                <Button onClick={handleSave} disabled={saving} className="w-full">
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  ) : (
                    <Save className="w-4 h-4 ml-2" />
                  )}
                  {editingRole ? "حفظ التعديلات" : "إضافة الرول"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {roles.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Shield className="w-16 h-16 mx-auto mb-4 opacity-50" />
              لا توجد رولات مخصصة
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((role) => (
              <Card key={role.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-primary" />
                      {role.name}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(role)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => handleDelete(role.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {role.permissions.map((perm) => {
                      const section = ADMIN_SECTIONS.find(s => s.id === perm);
                      return (
                        <Badge key={perm} variant="secondary" className="text-xs">
                          {section?.icon} {section?.name || perm}
                        </Badge>
                      );
                    })}
                  </div>
                  {role.created_by && (
                    <p className="text-xs text-muted-foreground mt-3">
                      بواسطة: {role.created_by}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      {/* Users Role Assignment Tab */}
      <TabsContent value="users" className="space-y-6">
        <div className="flex justify-end">
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className={`w-4 h-4 ml-2 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </Button>
        </div>

        {users.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <User className="w-16 h-16 mx-auto mb-4 opacity-50" />
              لا يوجد مستخدمين مفعلين
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {users.map((user) => {
              const userAssignedRoles = getUserRoles(user.id);
              
              return (
                <Card key={user.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <User className="w-5 h-5 text-primary" />
                        <span>{user.discord_username}</span>
                        <span className="text-sm text-muted-foreground font-normal">
                          ({user.email})
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openUserRoleDialog(user)}
                        className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                      >
                        <Settings className="w-4 h-4 ml-1" />
                        تحكم بالرول
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">الرولات:</span>
                      {userAssignedRoles.length === 0 ? (
                        <span className="text-sm text-muted-foreground">لا يوجد رولات</span>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {userAssignedRoles.map((role) => (
                            <Badge 
                              key={role.id} 
                              variant="secondary"
                              className="flex items-center gap-1"
                            >
                              {role.name}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-4 w-4 p-0 ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full"
                                onClick={() => handleRemoveUserRole(user.id, role.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Assign Role Dialog */}
        <Dialog open={isUserRoleDialogOpen} onOpenChange={setIsUserRoleDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إسناد رول لـ {selectedUser?.discord_username}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>اختر الرول</Label>
                <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="اختر رول..." />
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
              
              {roles.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  لا توجد رولات. قم بإنشاء رول من قسم إدارة الرولات أولاً.
                </p>
              )}

              <Button 
                onClick={handleAssignRole} 
                disabled={assigning || !selectedRoleId} 
                className="w-full"
              >
                {assigning ? (
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                ) : (
                  <UserPlus className="w-4 h-4 ml-2" />
                )}
                إسناد الرول
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </TabsContent>
    </Tabs>
  );
};

export default RolesTab;
