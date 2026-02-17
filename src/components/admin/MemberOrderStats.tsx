import { useState, useEffect } from "react";
import { BarChart3, Loader2, RefreshCw, Users, Mail, Clock, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

interface MemberStats {
  userId: string;
  discordUsername: string;
  email: string;
  roles: string[];
  totalOrders: number;
  pendingOrders: number;
  acceptedOrders: number;
  completedOrders: number;
  rejectedOrders: number;
  handledOrders: number;
  lastCheckin: string | null;
  isActiveNow: boolean;
  totalHoursConnected: number;
}

const MemberOrderStats = () => {
  const [stats, setStats] = useState<MemberStats[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Get all approved users first
      const { data: allUsers, error: usersError } = await supabase
        .from("approved_users")
        .select("id, discord_username, email");

      if (usersError) throw usersError;

      // Get all users with standard roles (admin/user)
      const { data: usersWithRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .is("removed_at", null);

      if (rolesError) throw rolesError;

      // Get custom roles assignments with role names
      const { data: customRolesData, error: customError } = await supabase
        .from("user_custom_roles")
        .select(`
          user_id,
          custom_roles!inner(name)
        `);

      if (customError) throw customError;

      // Get all orders including handled_by info
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("user_id, status, handled_by_email, handled_by_discord");

      if (ordersError) throw ordersError;

      // Get all staff checkins for hours calculation
      const { data: allCheckinsData, error: allCheckinsError } = await supabase
        .from("staff_checkins")
        .select("user_id, checked_in_at, checked_out_at, is_active");

      if (allCheckinsError) throw allCheckinsError;

      // Get staff checkins - latest for each user
      const { data: checkinsData, error: checkinsError } = await supabase
        .from("staff_checkins")
        .select("user_id, checked_in_at, is_active")
        .order("checked_in_at", { ascending: false });

      if (checkinsError) throw checkinsError;

      // Build stats map
      const userStatsMap = new Map<string, MemberStats>();

      // Initialize all users who have any role (standard or custom)
      const usersWithAnyRole = new Set<string>();
      
      usersWithRoles?.forEach((item: any) => usersWithAnyRole.add(item.user_id));
      customRolesData?.forEach((item: any) => usersWithAnyRole.add(item.user_id));

      // Create email/discord to user mapping for handled_by lookup
      const emailToUserId = new Map<string, string>();
      const discordToUserId = new Map<string, string>();
      allUsers?.forEach((user: any) => {
        emailToUserId.set(user.email, user.id);
        discordToUserId.set(user.discord_username, user.id);
      });

      // Create stats for users with roles
      allUsers?.forEach((user: any) => {
        if (usersWithAnyRole.has(user.id)) {
          userStatsMap.set(user.id, {
            userId: user.id,
            discordUsername: user.discord_username,
            email: user.email,
            roles: [],
            totalOrders: 0,
            pendingOrders: 0,
            acceptedOrders: 0,
            completedOrders: 0,
            rejectedOrders: 0,
            handledOrders: 0,
            lastCheckin: null,
            isActiveNow: false,
            totalHoursConnected: 0,
          });
        }
      });

      // Add standard roles
      usersWithRoles?.forEach((item: any) => {
        const userId = item.user_id;
        if (userStatsMap.has(userId)) {
          const stats = userStatsMap.get(userId)!;
          const roleName = item.role === 'admin' ? 'أدمن' : 'مستخدم';
          if (!stats.roles.includes(roleName)) {
            stats.roles.push(roleName);
          }
        }
      });

      // Add custom roles (البائعين والرولات المخصصة)
      customRolesData?.forEach((item: any) => {
        const userId = item.user_id;
        if (userStatsMap.has(userId)) {
          const stats = userStatsMap.get(userId)!;
          const roleName = item.custom_roles?.name;
          if (roleName && !stats.roles.includes(roleName)) {
            stats.roles.push(roleName);
          }
        }
      });

      // Count orders handled by each member (using handled_by_email or handled_by_discord)
      ordersData?.forEach((order: any) => {
        // Count orders handled by this member
        if (order.handled_by_email || order.handled_by_discord) {
          let handlerId: string | undefined;
          
          if (order.handled_by_email) {
            handlerId = emailToUserId.get(order.handled_by_email);
          }
          if (!handlerId && order.handled_by_discord) {
            handlerId = discordToUserId.get(order.handled_by_discord);
          }
          
          if (handlerId && userStatsMap.has(handlerId)) {
            const stats = userStatsMap.get(handlerId)!;
            stats.handledOrders++;
            
            // Count by status for handled orders
            switch (order.status) {
              case 'accepted':
                stats.acceptedOrders++;
                break;
              case 'completed':
                stats.completedOrders++;
                break;
              case 'rejected':
                stats.rejectedOrders++;
                break;
            }
          }
        }
      });

      // Process checkins - get latest for each user
      const userCheckins = new Map<string, { checkedInAt: string; isActive: boolean }>();
      checkinsData?.forEach((checkin: any) => {
        if (!userCheckins.has(checkin.user_id)) {
          userCheckins.set(checkin.user_id, {
            checkedInAt: checkin.checked_in_at,
            isActive: checkin.is_active,
          });
        }
      });

      // Apply checkin data to stats
      userCheckins.forEach((checkin, userId) => {
        if (userStatsMap.has(userId)) {
          const stats = userStatsMap.get(userId)!;
          stats.lastCheckin = checkin.checkedInAt;
          stats.isActiveNow = checkin.isActive;
        }
      });

      // Calculate total connected hours from all checkins
      allCheckinsData?.forEach((checkin: any) => {
        const userId = checkin.user_id;
        if (userStatsMap.has(userId)) {
          const stats = userStatsMap.get(userId)!;
          const start = new Date(checkin.checked_in_at).getTime();
          const end = checkin.checked_out_at 
            ? new Date(checkin.checked_out_at).getTime()
            : (checkin.is_active ? Date.now() : start); // If active, count until now
          const durationHours = (end - start) / (1000 * 60 * 60);
          if (durationHours > 0 && durationHours < 720) { // Cap at 30 days to filter bad data
            stats.totalHoursConnected += durationHours;
          }
        }
      });

      // Calculate total orders as sum of all handled orders
      userStatsMap.forEach((stats) => {
        stats.totalOrders = stats.handledOrders;
        stats.totalHoursConnected = Math.round(stats.totalHoursConnected * 10) / 10;
      });

      // Convert to array and sort by handled orders
      const statsArray = Array.from(userStatsMap.values())
        .filter(s => s.roles.length > 0)
        .sort((a, b) => b.handledOrders - a.handledOrders);

      setStats(statsArray);
    } catch (error) {
      console.error("Error fetching member stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatLastActivity = (lastCheckin: string | null) => {
    if (!lastCheckin) return "لم يسجل بعد";
    return formatDistanceToNow(new Date(lastCheckin), { addSuffix: true, locale: ar });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            إحصائيات الطلبات لكل عضو
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchStats}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {stats.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>لا يوجد أعضاء بأدوار</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">العضو</TableHead>
                  <TableHead className="text-right">الأدوار</TableHead>
                   <TableHead className="text-center">آخر نشاط</TableHead>
                   <TableHead className="text-center">ساعات الاتصال</TableHead>
                   <TableHead className="text-center">طلبات مستلمة</TableHead>
                   <TableHead className="text-center">قيد التنفيذ</TableHead>
                   <TableHead className="text-center">مكتملة</TableHead>
                   <TableHead className="text-center">مرفوضة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map((member) => (
                  <TableRow key={member.userId}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          {member.discordUsername}
                          {member.isActiveNow && (
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="متاح الآن" />
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {member.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {member.roles.map((role, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {formatLastActivity(member.lastCheckin)}
                        </div>
                        {member.isActiveNow && (
                          <Badge variant="default" className="text-xs bg-green-500">
                            <Activity className="w-3 h-3 ml-1" />
                            متاح
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="font-medium">{member.totalHoursConnected}h</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="font-bold">
                        {member.handledOrders}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-blue-500 font-medium">
                        {member.acceptedOrders}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-green-500 font-medium">
                        {member.completedOrders}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-red-500 font-medium">
                        {member.rejectedOrders}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MemberOrderStats;
