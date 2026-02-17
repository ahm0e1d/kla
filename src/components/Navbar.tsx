import { Link, useLocation, useNavigate } from "react-router-dom";
import { ShoppingCart, Home, Package, MessageCircle, Settings, LogIn, LogOut, UserCircle, History, ScrollText, Briefcase } from "lucide-react";
import { useShop } from "@/context/ShopContext";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import NotificationBell from "@/components/NotificationBell";
import MobileMenu from "@/components/MobileMenu";
import { supabase } from "@/integrations/supabase/client";
import logoAnimated from "@/assets/logo-animated.png";
import useTheme from "@/hooks/useTheme";

interface ShopUser {
  id: string;
  email: string;
  discord_username: string;
}

interface NavLink {
  id: string;
  path: string;
  label: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
  badge?: number;
}

const DEFAULT_LINKS: NavLink[] = [{
  id: "home",
  path: "/",
  label: "الرئيسية",
  icon: Home
}, {
  id: "products",
  path: "/products",
  label: "المنتجات",
  icon: Package
}, {
  id: "cart",
  path: "/cart",
  label: "السلة",
  icon: ShoppingCart
}, {
  id: "rules",
  path: "/rules",
  label: "القوانين",
  icon: ScrollText
}, {
  id: "recruitment",
  path: "/recruitment",
  label: "التوظيف",
  icon: Briefcase
}, {
  id: "contact",
  path: "/contact",
  label: "تواصل معنا",
  icon: MessageCircle
}];

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { cartItemsCount } = useShop();
  const { user, isAdmin, hasCustomRole, signOut } = useAuth();
  const { shopName } = useTheme();
  const [shopUser, setShopUser] = useState<ShopUser | null>(null);
  const [navOrder, setNavOrder] = useState<string[]>(["home", "products", "cart", "rules", "contact"]);

  useEffect(() => {
    const storedUser = localStorage.getItem("shop_user");
    if (storedUser) {
      setShopUser(JSON.parse(storedUser));
    }
  }, [location]);

  useEffect(() => {
    fetchNavOrder();
  }, []);

  const fetchNavOrder = async () => {
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "navbar_order")
        .maybeSingle();
      if (!error && data && Array.isArray(data.value)) {
        setNavOrder(data.value as string[]);
      }
    } catch (error) {
      console.error("Error fetching nav order:", error);
    }
  };

  const handleShopLogout = () => {
    localStorage.removeItem("shop_user");
    setShopUser(null);
    navigate("/auth");
  };

  const handleLogout = async () => {
    await signOut();
  };

  // Order links based on saved order
  const orderedLinks = navOrder
    .map(id => DEFAULT_LINKS.find(l => l.id === id))
    .filter(Boolean) as NavLink[];

  // Add any links not in the order
  DEFAULT_LINKS.forEach(link => {
    if (!orderedLinks.find(l => l.id === link.id)) {
      orderedLinks.push(link);
    }
  });

  // Add badge to cart
  const linksWithBadge = orderedLinks.map(link => ({
    ...link,
    badge: link.id === "cart" ? cartItemsCount : undefined
  }));

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo with animated image */}
          <Link to="/" className="flex items-center gap-2">
            <motion.img 
              src={logoAnimated} 
              alt="Walker Family Shop logo" 
              className="w-10 h-10 rounded-md"
              animate={{ 
                rotate: [0, 5, -5, 0],
                scale: [1, 1.05, 1]
              }}
              transition={{ 
                duration: 3,
                repeat: Infinity,
                repeatType: "reverse"
              }}
            />
            <span className="font-bold text-gradient text-sm md:text-base">{shopName || "Walker Family Shop"}</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2 lg:gap-4">
            {linksWithBadge.map(link => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg transition-all duration-300 ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-secondary/10 text-muted-foreground"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium text-sm lg:text-base">{link.label}</span>
                  {link.badge !== undefined && link.badge > 0 && (
                    <Badge variant="secondary" className="bg-accent text-accent-foreground">
                      {link.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}

            {/* Notification Bell */}
            <NotificationBell />

            {user ? (
              <>
                {(isAdmin || hasCustomRole) && (
                  <Link
                    to="/admin"
                    className={`flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg transition-all duration-300 ${
                      location.pathname === "/admin"
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-secondary/10 text-muted-foreground"
                    }`}
                  >
                    <Settings className="w-5 h-5" />
                    <span className="font-medium">{isAdmin ? "الإدارة" : "لوحة التحكم"}</span>
                  </Link>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="w-4 h-4 ml-1" />
                  خروج
                </Button>
              </>
            ) : shopUser ? (
              <>
                <Link
                  to="/orders"
                  className={`flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg transition-all duration-300 ${
                    location.pathname === "/orders"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-secondary/10 text-muted-foreground"
                  }`}
                >
                  <History className="w-5 h-5" />
                  <span className="font-medium">طلباتي</span>
                </Link>
                <div className="flex items-center gap-2 px-3 py-1 bg-secondary rounded-full">
                  <UserCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">{shopUser.discord_username}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleShopLogout}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="w-4 h-4 ml-1" />
                  خروج
                </Button>
              </>
            ) : (
              <>
                <Link
                  to="/auth"
                  className={`flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg transition-all duration-300 ${
                    location.pathname === "/auth"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-secondary/10 text-muted-foreground"
                  }`}
                >
                  <LogIn className="w-5 h-5" />
                  <span className="font-medium">دخول</span>
                </Link>
                <Link
                  to="/login"
                  className={`flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg transition-all duration-300 ${
                    location.pathname === "/login"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-secondary/10 text-muted-foreground"
                  }`}
                >
                  <Settings className="w-5 h-5" />
                  <span className="font-medium">المالك</span>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Navigation */}
          <div className="flex md:hidden items-center gap-2">
            <NotificationBell />
            <MobileMenu
              links={linksWithBadge}
              isAdmin={isAdmin}
              hasCustomRole={hasCustomRole}
              user={user}
              shopUser={shopUser}
              onLogout={handleLogout}
              onShopLogout={handleShopLogout}
            />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
