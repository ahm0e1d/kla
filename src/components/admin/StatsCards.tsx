import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ShoppingBag, UserCheck, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Stats {
  totalApprovedUsers: number;
  totalPendingUsers: number;
  totalOrders: number;
  pendingOrders: number;
  acceptedOrders: number;
  completedOrders: number;
  rejectedOrders: number;
}

const StatsCards = () => {
  const [stats, setStats] = useState<Stats>({
    totalApprovedUsers: 0,
    totalPendingUsers: 0,
    totalOrders: 0,
    pendingOrders: 0,
    acceptedOrders: 0,
    completedOrders: 0,
    rejectedOrders: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Fetch approved users count
      const { count: approvedCount } = await supabase
        .from("approved_users")
        .select("*", { count: "exact", head: true });

      // Fetch pending users count
      const { count: pendingCount } = await supabase
        .from("pending_users")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      // Fetch all orders
      const { data: ordersData } = await supabase
        .from("orders")
        .select("status");

      const orders = ordersData || [];
      const pendingOrders = orders.filter(o => o.status === "pending").length;
      const acceptedOrders = orders.filter(o => o.status === "accepted").length;
      const completedOrders = orders.filter(o => o.status === "completed").length;
      const rejectedOrders = orders.filter(o => o.status === "rejected").length;

      setStats({
        totalApprovedUsers: approvedCount || 0,
        totalPendingUsers: pendingCount || 0,
        totalOrders: orders.length,
        pendingOrders,
        acceptedOrders,
        completedOrders,
        rejectedOrders,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const statCards = [
    {
      title: "المستخدمين المعتمدين",
      value: stats.totalApprovedUsers,
      icon: UserCheck,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "طلبات التسجيل المعلقة",
      value: stats.totalPendingUsers,
      icon: Clock,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
    {
      title: "إجمالي الطلبات",
      value: stats.totalOrders,
      icon: ShoppingBag,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "طلبات معلقة",
      value: stats.pendingOrders,
      icon: Clock,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      title: "طلبات قيد التنفيذ",
      value: stats.acceptedOrders,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "طلبات مكتملة",
      value: stats.completedOrders,
      icon: CheckCircle,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "طلبات مرفوضة",
      value: stats.rejectedOrders,
      icon: XCircle,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
      {statCards.map((stat, index) => (
        <Card key={index} className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stat.color}`}>
              {stat.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default StatsCards;
