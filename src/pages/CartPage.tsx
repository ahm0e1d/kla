import { useState, useEffect } from "react";
import { Minus, Plus, Trash2, ShoppingBag, AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useShop } from "@/context/ShopContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { sendPurchaseWebhook } from "@/lib/webhooks";
import { useNavigate } from "react-router-dom";
import { useStoreStatus } from "@/hooks/useStoreStatus";

const CartPage = () => {
  const { cart, updateCartQuantity, removeFromCart, clearCart, cartTotal } = useShop();
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isOpen, storeHours, loading: storeLoading, isVacation, vacationMessage } = useStoreStatus();
  
  const [accountName, setAccountName] = useState("");
  const [characterName, setCharacterName] = useState("");
  const [discordUsername, setDiscordUsername] = useState("");
  const [orderId, setOrderId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check if user is logged in via shop_user OR is admin
    const userSession = localStorage.getItem("shop_user");
    if (userSession || isAdmin) {
      setIsLoggedIn(true);
      setIsApproved(true);
    }
  }, [isAdmin]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("ar-SA").format(price);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const period = hour >= 12 ? "مساءً" : "صباحاً";
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${period}`;
  };

  const handleCheckout = async () => {
    if (!accountName || !characterName || !discordUsername || !orderId) {
      toast({
        title: "خطأ",
        description: "الرجاء ملء جميع الحقول",
        variant: "destructive",
      });
      return;
    }

    if (cart.length === 0) {
      toast({
        title: "السلة فارغة",
        description: "الرجاء إضافة منتجات إلى السلة",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    // Get user session
    const userSession = localStorage.getItem("shop_user");
    const user = userSession ? JSON.parse(userSession) : null;

    // Create order in database
    let orderNumber = "";
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: orderData, error: orderError } = await supabase.functions.invoke("create-order", {
        body: {
          user_id: user?.id,
          account_name: accountName,
          character_name: characterName,
          discord_username: discordUsername,
          game_id: orderId,
          items: cart.map((item) => ({
            name: item.name,
            quantity: item.cartQuantity,
            price: item.price * item.cartQuantity,
          })),
          total: cartTotal,
        },
      });

      if (orderError) {
        console.error("Error creating order:", orderError);
      } else if (orderData?.order?.order_number) {
        orderNumber = orderData.order.order_number;
      }
    } catch (error) {
      console.error("Error:", error);
    }

    // Send webhook
    const success = await sendPurchaseWebhook({
      orderNumber,
      accountName,
      characterName,
      discordUsername,
      oderId: orderId,
      items: cart.map((item) => ({
        name: item.name,
        quantity: item.cartQuantity,
        price: item.price * item.cartQuantity,
      })),
      total: cartTotal,
    });

    setIsSubmitting(false);

    if (success) {
      toast({
        title: "تم الطلب بنجاح",
        description: "سنتواصل معك قريباً",
      });
      clearCart();
      setAccountName("");
      setCharacterName("");
      setDiscordUsername("");
      setOrderId("");
    } else {
      toast({
        title: "تم إرسال الطلب",
        description: "سنتواصل معك قريباً",
      });
      clearCart();
    }
  };

  // Show message if not logged in
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4">
          <div className="text-center py-20">
            <AlertCircle className="w-24 h-24 mx-auto text-amber-500 mb-6" />
            <h1 className="text-3xl font-bold text-foreground mb-4">انتظر التفعيل</h1>
            <p className="text-muted-foreground mb-6">انتظر التفعيل من قبل الاونر للتمكن من الطلب</p>
            <Button onClick={() => navigate("/auth")} className="bg-primary hover:bg-primary/80">
              تسجيل الدخول
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show message if store is closed
  if (!storeLoading && !isOpen) {
    return (
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4">
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
              <Clock className="w-12 h-12 text-red-500" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-4">
              {isVacation ? "🏖️ المتجر في عطلة" : "🔴 المتجر مغلق"}
            </h1>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {isVacation && vacationMessage 
                ? vacationMessage 
                : "عذراً، المتجر مغلق حالياً. الرجاء العودة خلال أوقات العمل."
              }
            </p>
            {storeHours && !isVacation && (
              <div className="bg-card border border-border rounded-xl p-6 max-w-sm mx-auto">
                <h3 className="font-semibold mb-3 flex items-center justify-center gap-2">
                  <Clock className="w-5 h-5" />
                  أوقات العمل
                </h3>
                <p className="text-muted-foreground">
                  من {formatTime(storeHours.openTime)} إلى {formatTime(storeHours.closeTime)}
                </p>
              </div>
            )}
            <Button onClick={() => navigate("/products")} className="mt-6 bg-primary hover:bg-primary/80">
              تصفح المنتجات
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4">
          <div className="text-center py-20">
            <ShoppingBag className="w-24 h-24 mx-auto text-muted-foreground mb-6" />
            <h1 className="text-3xl font-bold text-foreground mb-4">السلة فارغة</h1>
            <p className="text-muted-foreground">لم تقم بإضافة أي منتجات بعد</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold text-foreground mb-8 text-center">سلة التسوق</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items - Hidden on mobile when there are items */}
          <div className="lg:col-span-2 space-y-4">
            {cart.map((item) => (
              <Card key={item.id} className="p-4 md:p-6 bg-card border-border">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                    {item.image.startsWith('http') ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl md:text-4xl">{item.image}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 w-full">
                    <h3 className="text-base md:text-lg font-bold text-foreground truncate">{item.name}</h3>
                    <p className="text-accent font-semibold text-sm md:text-base">{formatPrice(item.price)}</p>
                  </div>
                  <div className="flex items-center justify-between w-full sm:w-auto gap-3">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 border-border"
                        onClick={() => updateCartQuantity(item.id, item.cartQuantity - 1)}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-8 text-center font-semibold text-sm">{item.cartQuantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 border-border"
                        onClick={() => updateCartQuantity(item.id, item.cartQuantity + 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <p className="font-bold text-foreground text-sm md:text-base">
                      {formatPrice(item.price * item.cartQuantity)}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => removeFromCart(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Checkout Form */}
          <div>
            <Card className="p-4 md:p-6 bg-card border-border sticky top-24">
              <h2 className="text-xl md:text-2xl font-bold text-foreground mb-4 md:mb-6">إتمام الشراء</h2>

              <div className="space-y-3 md:space-y-4 mb-4 md:mb-6">
                <div>
                  <Label htmlFor="accountName" className="text-sm">اسم الحساب</Label>
                  <Input
                    id="accountName"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="أدخل اسم الحساب"
                    className="bg-input border-border h-10"
                  />
                </div>
                <div>
                  <Label htmlFor="characterName" className="text-sm">اسم الشخصية</Label>
                  <Input
                    id="characterName"
                    value={characterName}
                    onChange={(e) => setCharacterName(e.target.value)}
                    placeholder="أدخل اسم الشخصية"
                    className="bg-input border-border h-10"
                  />
                </div>
                <div>
                  <Label htmlFor="discordUsername" className="text-sm">يوزر الديسكورد</Label>
                  <Input
                    id="discordUsername"
                    value={discordUsername}
                    onChange={(e) => setDiscordUsername(e.target.value)}
                    placeholder="أدخل يوزر الديسكورد"
                    className="bg-input border-border h-10"
                  />
                </div>
                <div>
                  <Label htmlFor="orderId" className="text-sm">الايدي</Label>
                  <Input
                    id="orderId"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    placeholder="أدخل الايدي"
                    className="bg-input border-border h-10"
                  />
                </div>
              </div>

              <div className="border-t border-border pt-4 mb-4 md:mb-6">
                <div className="flex justify-between text-base md:text-lg font-bold">
                  <span>المجموع الكلي</span>
                  <span className="text-accent">{formatPrice(cartTotal)}</span>
                </div>
              </div>

              <Button
                onClick={handleCheckout}
                disabled={isSubmitting}
                className="w-full bg-primary hover:bg-primary/80 text-primary-foreground font-semibold py-4 md:py-6 text-base md:text-lg"
              >
                {isSubmitting ? "جاري الإرسال..." : "إتمام الشراء"}
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
