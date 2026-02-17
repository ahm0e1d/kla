import { useState, useEffect } from "react";
import { Package, Clock, CheckCircle, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  order_number: string;
  account_name: string;
  character_name: string;
  discord_username: string;
  game_id: string;
  items: OrderItem[];
  total: number;
  status: string;
  created_at: string;
  rejection_reason?: string;
}

const OrderHistoryPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const userSession = localStorage.getItem("shop_user");
    if (!userSession) {
      navigate("/auth");
      return;
    }

    const user = JSON.parse(userSession);
    fetchOrders(user.id);
  }, [navigate]);

  const fetchOrders = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching orders:", error);
        return;
      }

      // Transform the data to ensure items is properly typed
      const transformedOrders = (data || []).map(order => ({
        ...order,
        items: order.items as unknown as OrderItem[]
      }));

      setOrders(transformedOrders);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("ar-SA").format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-amber-500/20 text-amber-500">
            <Clock className="w-3 h-3 mr-1" />
            قيد الانتظار
          </Badge>
        );
      case "accepted":
        return (
          <Badge variant="secondary" className="bg-blue-500/20 text-blue-500">
            <CheckCircle className="w-3 h-3 mr-1" />
            تم الاستلام
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="secondary" className="bg-green-500/20 text-green-500">
            <CheckCircle className="w-3 h-3 mr-1" />
            مكتمل
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="secondary" className="bg-red-500/20 text-red-500">
            <XCircle className="w-3 h-3 mr-1" />
            مرفوض
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="secondary" className="bg-red-500/20 text-red-500">
            <XCircle className="w-3 h-3 mr-1" />
            ملغي
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4">
          <div className="text-center py-20">
            <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="text-muted-foreground mt-4">جاري التحميل...</p>
          </div>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4">
          <div className="text-center py-20">
            <Package className="w-24 h-24 mx-auto text-muted-foreground mb-6" />
            <h1 className="text-3xl font-bold text-foreground mb-4">لا توجد طلبات</h1>
            <p className="text-muted-foreground">لم تقم بأي طلبات بعد</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold text-foreground mb-8 text-center">تاريخ الطلبات</h1>

        <div className="space-y-6 max-w-4xl mx-auto">
          {orders.map((order) => (
            <Card key={order.id} className="p-6 bg-card border-border">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    رقم الطلب: {order.order_number}
                  </h3>
                  <p className="text-sm text-muted-foreground">{formatDate(order.created_at)}</p>
                </div>
                {getStatusBadge(order.status)}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                <div>
                  <span className="text-muted-foreground">اسم الحساب:</span>
                  <p className="font-medium">{order.account_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">اسم الشخصية:</span>
                  <p className="font-medium">{order.character_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">الديسكورد:</span>
                  <p className="font-medium">{order.discord_username}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">الايدي:</span>
                  <p className="font-medium">{order.game_id}</p>
                </div>
              </div>

              {/* Rejection Reason */}
              {order.status === "rejected" && order.rejection_reason && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                  <p className="text-sm font-medium text-red-500 mb-1">سبب الرفض:</p>
                  <p className="text-sm text-foreground">{order.rejection_reason}</p>
                </div>
              )}

              <div className="border-t border-border pt-4">
                <h4 className="font-medium mb-2">المنتجات:</h4>
                <div className="space-y-2">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>
                        {item.name} × {item.quantity}
                      </span>
                      <span className="text-accent">{formatPrice(item.price)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between font-bold mt-4 pt-2 border-t border-border">
                  <span>المجموع</span>
                  <span className="text-accent">{formatPrice(order.total)}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OrderHistoryPage;
