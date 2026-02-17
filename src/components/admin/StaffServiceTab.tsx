import { useState, useEffect } from "react";
import { LogIn, LogOut, Loader2, Users, Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

interface StaffMember {
  id: string;
  user_id: string;
  discord_username: string;
  email: string;
  checked_in_at: string;
  roles: string[];
}

interface StaffServiceTabProps {
  adminEmail?: string;
}

const StaffServiceTab = ({ adminEmail }: StaffServiceTabProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [activeStaff, setActiveStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserDiscord, setCurrentUserDiscord] = useState<string | null>(null);

  const fetchCurrentUser = async () => {
    if (!user?.email) return;
    
    try {
      const { data, error } = await supabase
        .from("approved_users")
        .select("id, discord_username")
        .eq("email", user.email)
        .single();

      if (error) throw error;
      
      setCurrentUserId(data?.id || null);
      setCurrentUserDiscord(data?.discord_username || null);
    } catch (error) {
      console.error("Error fetching current user:", error);
    }
  };

  const fetchActiveStaff = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("staff-checkin-webhook", {
        body: { action: "get_status" },
      });

      if (error) throw error;

      setActiveStaff(data.staff || []);
      
      // Check if current user is checked in
      if (currentUserId) {
        const isUserCheckedIn = data.staff?.some((s: StaffMember) => s.user_id === currentUserId);
        setIsCheckedIn(isUserCheckedIn);
      }
    } catch (error) {
      console.error("Error fetching staff status:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, [user]);

  useEffect(() => {
    if (currentUserId) {
      fetchActiveStaff();

      // Set up realtime subscription
      const channel = supabase
        .channel("staff-checkins-realtime")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "staff_checkins",
          },
          () => {
            fetchActiveStaff();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentUserId]);

  const handleCheckin = async () => {
    if (!currentUserId) {
      toast({
        title: "خطأ",
        description: "لم يتم العثور على حسابك",
        variant: "destructive",
      });
      return;
    }

    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("staff-checkin-webhook", {
        body: {
          action: "checkin",
          user_id: currentUserId,
          discord_username: currentUserDiscord,
          user_email: user?.email,
        },
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

      setIsCheckedIn(true);
      toast({
        title: "تم!",
        description: "تم تسجيل دخولك للخدمة بنجاح",
      });
      
      fetchActiveStaff();
    } catch (error) {
      console.error("Error checking in:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تسجيل الدخول",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!currentUserId) return;

    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("staff-checkin-webhook", {
        body: {
          action: "checkout",
          user_id: currentUserId,
          discord_username: currentUserDiscord,
          user_email: user?.email,
        },
      });

      if (error) throw error;

      setIsCheckedIn(false);
      toast({
        title: "تم!",
        description: "تم تسجيل خروجك من الخدمة",
      });
      
      fetchActiveStaff();
    } catch (error) {
      console.error("Error checking out:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تسجيل الخروج",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("ar-SA", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Baghdad",
    });
  };

  // Group staff by roles
  const staffByRole = activeStaff.reduce((acc, staff) => {
    for (const role of staff.roles) {
      if (!acc[role]) acc[role] = [];
      if (!acc[role].find(s => s.user_id === staff.user_id)) {
        acc[role].push(staff);
      }
    }
    return acc;
  }, {} as Record<string, StaffMember[]>);

  return (
    <div className="space-y-6">
      {/* Check-in/Check-out Card */}
      <Card className={`border-2 ${isCheckedIn ? "border-green-500/50 bg-green-500/5" : "border-muted"}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Users className="w-6 h-6" />
            تسجيل في الخدمة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full ${isCheckedIn ? "bg-green-500 animate-pulse" : "bg-muted"}`} />
              <span className="text-lg">
                {isCheckedIn ? (
                  <span className="text-green-500 font-medium">أنت متاح للخدمة ✅</span>
                ) : (
                  <span className="text-muted-foreground">غير متاح للخدمة</span>
                )}
              </span>
            </div>
            
            <div className="flex gap-3">
              {!isCheckedIn ? (
                <Button
                  onClick={handleCheckin}
                  disabled={actionLoading}
                  className="bg-green-600 hover:bg-green-700 gap-2"
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <LogIn className="w-4 h-4" />
                  )}
                  تسجيل دخول
                </Button>
              ) : (
                <Button
                  onClick={handleCheckout}
                  disabled={actionLoading}
                  variant="destructive"
                  className="gap-2"
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <LogOut className="w-4 h-4" />
                  )}
                  تسجيل خروج
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Staff List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              الموظفين المتاحين حالياً
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchActiveStaff}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : activeStaff.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>لا يوجد موظفين متاحين حالياً</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(staffByRole).map(([role, members]) => (
                <div key={role}>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Badge variant="outline" className="text-sm">
                      {role}
                    </Badge>
                    <span className="text-muted-foreground text-sm">
                      ({members.length})
                    </span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {members.map((staff) => (
                      <Card key={staff.id} className="border-green-500/30 bg-green-500/5">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                            <div className="flex-1">
                              <p className="font-medium">{staff.discord_username || staff.email}</p>
                              <p className="text-xs text-muted-foreground">
                                منذ {formatTime(staff.checked_in_at)}
                              </p>
                            </div>
                            <span className="text-green-500">✅</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>• سجل دخولك عندما تكون جاهزاً لاستقبال الطلبات</p>
            <p>• سيتم إرسال إشعار Discord عند تسجيل الدخول/الخروج</p>
            <p>• يمكن للعملاء رؤية الموظفين المتاحين</p>
            <p>• يتم تجميع الموظفين حسب أدوارهم في المتجر</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffServiceTab;
