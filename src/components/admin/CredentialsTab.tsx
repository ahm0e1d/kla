import { useState, useEffect } from "react";
import { Loader2, Key, User, Mail, Shield, RefreshCw, Search, UserPlus, Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ApprovedUser {
  id: string;
  email: string;
  discord_username: string;
  password_hash: string;
  created_at: string;
  last_login?: string;
  approved_by_email?: string;
}

interface CustomRole {
  id: string;
  name: string;
  permissions: string[];
}

interface UserCustomRole {
  id: string;
  user_id: string;
  role_id: string;
  assigned_at: string;
  assigned_by?: string;
}

interface CredentialsTabProps {
  adminEmail?: string;
}

const CredentialsTab = ({ adminEmail }: CredentialsTabProps) => {
  const { toast } = useToast();
  const [users, setUsers] = useState<ApprovedUser[]>([]);
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [userRoles, setUserRoles] = useState<UserCustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Assign role dialog
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ApprovedUser | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [assigning, setAssigning] = useState(false);

  // Reset password dialog
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [resetUser, setResetUser] = useState<ApprovedUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes, userRolesRes] = await Promise.all([
        supabase.from("approved_users").select("*").order("created_at", { ascending: false }),
        supabase.from("custom_roles").select("*"),
        supabase.from("user_custom_roles").select("*")
      ]);

      if (usersRes.error) throw usersRes.error;
      if (rolesRes.error) throw rolesRes.error;
      if (userRolesRes.error) throw userRolesRes.error;

      setUsers(usersRes.data || []);
      setRoles((rolesRes.data || []).map(r => ({
        ...r,
        permissions: Array.isArray(r.permissions) ? r.permissions as string[] : []
      })));
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

  const openResetDialog = (user: ApprovedUser) => {
    setResetUser(user);
    setNewPassword("");
    setIsResetDialogOpen(true);
  };

  const handleResetPassword = async () => {
    if (!resetUser || !newPassword) {
      toast({
        title: "خطأ",
        description: "الرجاء إدخال كلمة السر الجديدة",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "خطأ",
        description: "كلمة السر يجب أن تكون 6 أحرف على الأقل",
        variant: "destructive",
      });
      return;
    }

    setResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke("reset-user-password", {
        body: {
          user_id: resetUser.id,
          new_password: newPassword,
          admin_email: adminEmail
        }
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: "خطأ",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      toast({ title: "تم!", description: data.message });
      setIsResetDialogOpen(false);
    } catch (error) {
      console.error("Error resetting password:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إعادة تعيين كلمة السر",
        variant: "destructive",
      });
    } finally {
      setResetting(false);
    }
  };

  const getUserRoles = (userId: string) => {
    const userRoleIds = userRoles.filter(ur => ur.user_id === userId).map(ur => ur.role_id);
    return roles.filter(r => userRoleIds.includes(r.id));
  };

  const openAssignDialog = (user: ApprovedUser) => {
    setSelectedUser(user);
    setSelectedRoleId("");
    setIsAssignDialogOpen(true);
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
      setIsAssignDialogOpen(false);
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

  const handleRemoveRole = async (userId: string, roleId: string) => {
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

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.discord_username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالإيميل أو الديسكورد..."
            className="pr-10"
          />
        </div>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className={`w-4 h-4 ml-2 ${loading ? "animate-spin" : ""}`} />
          تحديث
        </Button>
      </div>

      {filteredUsers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Key className="w-16 h-16 mx-auto mb-4 opacity-50" />
            لا يوجد مستخدمين
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredUsers.map((user) => {
            const userAssignedRoles = getUserRoles(user.id);
            
            return (
              <Card key={user.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-primary" />
                      <span>{user.discord_username}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openAssignDialog(user)}
                    >
                      <UserPlus className="w-4 h-4 ml-1" />
                      إسناد رول
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="w-4 h-4" />
                        الإيميل
                      </div>
                      <p className="font-medium">{user.email}</p>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Key className="w-4 h-4" />
                        كلمة السر
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openResetDialog(user)}
                        >
                          <RotateCcw className="w-4 h-4 ml-1" />
                          إعادة تعيين
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Shield className="w-4 h-4" />
                        الرولات
                      </div>
                      {userAssignedRoles.length === 0 ? (
                        <p className="text-sm text-muted-foreground">لا يوجد رولات</p>
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
                                onClick={() => handleRemoveRole(user.id, role.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-4 mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
                    <span>تاريخ التسجيل: {new Date(user.created_at).toLocaleDateString("ar-SA")}</span>
                    {user.last_login && (
                      <span>آخر دخول: {new Date(user.last_login).toLocaleDateString("ar-SA")}</span>
                    )}
                    {user.approved_by_email && (
                      <span>تم التفعيل بواسطة: {user.approved_by_email}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Assign Role Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
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
                لا توجد رولات. قم بإنشاء رول من قسم الرولات أولاً.
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

      {/* Reset Password Dialog */}
      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إعادة تعيين كلمة السر لـ {resetUser?.discord_username}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>كلمة السر الجديدة</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="أدخل كلمة السر الجديدة (6 أحرف على الأقل)"
                className="mt-2"
                dir="ltr"
              />
            </div>

            <Button 
              onClick={handleResetPassword} 
              disabled={resetting || !newPassword} 
              className="w-full"
            >
              {resetting ? (
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
              ) : (
                <RotateCcw className="w-4 h-4 ml-2" />
              )}
              إعادة تعيين كلمة السر
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CredentialsTab;
