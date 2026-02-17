import { useState, useEffect } from "react";
import { Loader2, RefreshCw, Users, UserX, BarChart3, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface StaffMember {
  userId: string;
  discordUsername: string;
  email: string;
  roles: { id: string; name: string }[];
  handledOrders: number;
  completedOrders: number;
  rejectedOrders: number;
  acceptedOrders: number;
}

interface StaffAffairsTabProps {
  adminEmail?: string;
  adminDiscord?: string;
  isOwner: boolean;
}

const StaffAffairsTab = ({ adminEmail, adminDiscord, isOwner }: StaffAffairsTabProps) => {
  const { toast } = useToast();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissDialogOpen, setDismissDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [dismissReason, setDismissReason] = useState("");
  const [dismissing, setDismissing] = useState(false);
  const [resettingStats, setResettingStats] = useState<string | null>(null);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      // Get users with custom roles (these are the "sellers/staff")
      const { data: userCustomRoles, error: ucrError } = await supabase
        .from("user_custom_roles")
        .select(`
          user_id,
          role_id,
          custom_roles!inner(id, name)
        `);

      if (ucrError) throw ucrError;

      // Get unique user IDs
      const userIds = [...new Set((userCustomRoles || []).map((r: any) => r.user_id))];
      
      if (userIds.length === 0) {
        setStaff([]);
        setLoading(false);
        return;
      }

      // Get user info
      const { data: usersData, error: usersError } = await supabase
        .from("approved_users")
        .select("id, email, discord_username")
        .in("id", userIds);

      if (usersError) throw usersError;

      // Get orders handled by these staff
      const { data: ordersData } = await supabase
        .from("orders")
        .select("handled_by_email, handled_by_discord, status");

      // Build email/discord to userId maps
      const emailToId = new Map<string, string>();
      const discordToId = new Map<string, string>();
      (usersData || []).forEach((u: any) => {
        emailToId.set(u.email, u.id);
        discordToId.set(u.discord_username, u.id);
      });

      // Build staff list
      const staffMap = new Map<string, StaffMember>();
      
      (usersData || []).forEach((u: any) => {
        const roles = (userCustomRoles || [])
          .filter((r: any) => r.user_id === u.id)
          .map((r: any) => ({ id: r.custom_roles.id, name: r.custom_roles.name }));

        staffMap.set(u.id, {
          userId: u.id,
          discordUsername: u.discord_username,
          email: u.email,
          roles,
          handledOrders: 0,
          completedOrders: 0,
          rejectedOrders: 0,
          acceptedOrders: 0,
        });
      });

      // Count orders
      (ordersData || []).forEach((order: any) => {
        let handlerId: string | undefined;
        if (order.handled_by_email) handlerId = emailToId.get(order.handled_by_email);
        if (!handlerId && order.handled_by_discord) handlerId = discordToId.get(order.handled_by_discord);
        
        if (handlerId && staffMap.has(handlerId)) {
          const s = staffMap.get(handlerId)!;
          s.handledOrders++;
          if (order.status === "completed") s.completedOrders++;
          else if (order.status === "rejected") s.rejectedOrders++;
          else if (order.status === "accepted") s.acceptedOrders++;
        }
      });

      setStaff(Array.from(staffMap.values()).sort((a, b) => b.handledOrders - a.handledOrders));
    } catch (error) {
      console.error("Error fetching staff:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const openDismissDialog = (member: StaffMember) => {
    setSelectedStaff(member);
    setDismissReason("");
    setDismissDialogOpen(true);
  };

  const handleDismiss = async () => {
    if (!selectedStaff || !dismissReason.trim()) {
      toast({ title: "خطأ", description: "الرجاء إدخال سبب الفصل", variant: "destructive" });
      return;
    }

    setDismissing(true);
    try {
      // Call deactivate-user to remove from approved_users and roles
      const { data, error } = await supabase.functions.invoke("deactivate-user", {
        body: {
          user_id: selectedStaff.userId,
          reason: dismissReason,
          admin_email: adminEmail,
          admin_discord: adminDiscord,
        },
      });

      if (error) throw error;
      if (data?.error) {
        toast({ title: "خطأ", description: data.error, variant: "destructive" });
        return;
      }

      // Also remove custom roles
      await supabase
        .from("user_custom_roles")
        .delete()
        .eq("user_id", selectedStaff.userId);

      toast({ title: "تم!", description: `تم فصل ${selectedStaff.discordUsername} بنجاح` });
      setStaff(prev => prev.filter(s => s.userId !== selectedStaff.userId));
      setDismissDialogOpen(false);
    } catch (error) {
      console.error("Dismiss error:", error);
      toast({ title: "خطأ", description: "حدث خطأ أثناء فصل البائع", variant: "destructive" });
    } finally {
      setDismissing(false);
    }
  };

  const handleResetStats = async (member: StaffMember) => {
    setResettingStats(member.userId);
    try {
      // Reset stats by clearing handled_by for this user's orders
      const { error } = await supabase
        .from("orders")
        .update({ handled_by_email: null, handled_by_discord: null })
        .or(`handled_by_email.eq.${member.email},handled_by_discord.eq.${member.discordUsername}`);

      if (error) throw error;

      // Also reset staff checkins (connected hours)
      const { error: checkinsError } = await supabase
        .from("staff_checkins")
        .delete()
        .eq("user_id", member.userId);

      if (checkinsError) {
        console.error("Error resetting checkins:", checkinsError);
      }

      toast({ title: "تم!", description: `تم تصفير إحصائيات ${member.discordUsername}` });
      
      // Update local state
      setStaff(prev => prev.map(s => 
        s.userId === member.userId
          ? { ...s, handledOrders: 0, completedOrders: 0, rejectedOrders: 0, acceptedOrders: 0 }
          : s
      ));
    } catch (error) {
      console.error("Reset stats error:", error);
      toast({ title: "خطأ", description: "حدث خطأ أثناء تصفير الإحصائيات", variant: "destructive" });
    } finally {
      setResettingStats(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              شؤون البائعين
              {staff.length > 0 && (
                <Badge variant="secondary">{staff.length}</Badge>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={fetchStaff} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {staff.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>لا يوجد بائعين حالياً</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">البائع</TableHead>
                    <TableHead className="text-right">الرتب</TableHead>
                    <TableHead className="text-center">طلبات مستلمة</TableHead>
                    <TableHead className="text-center">قيد التنفيذ</TableHead>
                    <TableHead className="text-center">مكتملة</TableHead>
                    <TableHead className="text-center">مرفوضة</TableHead>
                    <TableHead className="text-center">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.map((member) => (
                    <TableRow key={member.userId}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{member.discordUsername}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {member.roles.map((role) => (
                            <Badge key={role.id} variant="outline" className="text-xs">
                              {role.name}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="font-bold">
                          {member.handledOrders}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-blue-500 font-medium">{member.acceptedOrders}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-green-500 font-medium">{member.completedOrders}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-red-500 font-medium">{member.rejectedOrders}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          {isOwner && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleResetStats(member)}
                                disabled={resettingStats === member.userId}
                                title="تصفير الإحصائيات"
                              >
                                {resettingStats === member.userId ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <BarChart3 className="w-4 h-4" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => openDismissDialog(member)}
                                title="فصل البائع"
                              >
                                <UserX className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dismiss Dialog */}
      <Dialog open={dismissDialogOpen} onOpenChange={(open) => {
        setDismissDialogOpen(open);
        if (!open) {
          setSelectedStaff(null);
          setDismissReason("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>فصل البائع - {selectedStaff?.discordUsername}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              سيتم حذف حساب البائع من لوحة الإدارة وسحب جميع الرتب. إذا قدّم من جديد سيُعامل كشخص جديد.
            </p>
            <div>
              <Label>سبب الفصل *</Label>
              <Input
                value={dismissReason}
                onChange={(e) => setDismissReason(e.target.value)}
                placeholder="أدخل سبب فصل البائع"
                className="mt-2"
              />
            </div>
            <Button
              variant="destructive"
              onClick={handleDismiss}
              disabled={dismissing || !dismissReason.trim()}
              className="w-full"
            >
              {dismissing ? (
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
              ) : (
                <UserX className="w-4 h-4 ml-2" />
              )}
              تأكيد فصل البائع
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffAffairsTab;
