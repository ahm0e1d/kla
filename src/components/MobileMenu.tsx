import { Link, useLocation } from "react-router-dom";
import { Menu, Home, Package, ShoppingCart, ScrollText, MessageCircle, LogIn, Settings, LogOut, History, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";
import logoAnimated from "@/assets/logo-animated.png";

interface NavLink {
  id: string;
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface MobileMenuProps {
  links: NavLink[];
  isAdmin?: boolean;
  hasCustomRole?: boolean;
  user: any;
  shopUser: any;
  onLogout: () => void;
  onShopLogout: () => void;
}

const MobileMenu = ({ links, isAdmin, hasCustomRole, user, shopUser, onLogout, onShopLogout }: MobileMenuProps) => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const handleLinkClick = () => {
    setIsOpen(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="w-6 h-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[300px] p-0 overflow-y-auto">
        <SheetHeader className="p-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2 justify-end">
            <span className="text-gradient font-bold text-sm truncate">Walker Family</span>
            <img src={logoAnimated} alt="Logo" className="w-8 h-8 rounded-md flex-shrink-0" />
          </SheetTitle>
        </SheetHeader>
        
        <nav className="flex flex-col p-3 gap-1">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={handleLinkClick}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-secondary/10 text-muted-foreground"
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium text-sm truncate flex-1">{link.label}</span>
                {link.badge !== undefined && link.badge > 0 && (
                  <Badge variant="secondary" className="bg-accent text-accent-foreground text-xs px-2 py-0.5 flex-shrink-0">
                    {link.badge}
                  </Badge>
                )}
              </Link>
            );
          })}

          <div className="h-px bg-border my-1.5" />

          {user ? (
            <>
              {(isAdmin || hasCustomRole) && (
                <Link
                  to="/admin"
                  onClick={handleLinkClick}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 ${
                    location.pathname === "/admin"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-secondary/10 text-muted-foreground"
                  }`}
                >
                  <Settings className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium text-sm">{isAdmin ? "الإدارة" : "لوحة التحكم"}</span>
                </Link>
              )}
              <Button
                variant="ghost"
                onClick={() => { onLogout(); handleLinkClick(); }}
                className="justify-start text-destructive hover:text-destructive hover:bg-destructive/10 w-full px-3 py-2.5 h-auto"
              >
                <LogOut className="w-5 h-5 ml-2 flex-shrink-0" />
                <span className="text-sm">خروج</span>
              </Button>
            </>
          ) : shopUser ? (
            <>
              <Link
                to="/orders"
                onClick={handleLinkClick}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 ${
                  location.pathname === "/orders"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-secondary/10 text-muted-foreground"
                }`}
              >
                <History className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium text-sm">طلباتي</span>
              </Link>
              <div className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg">
                <UserCircle className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium text-sm truncate">{shopUser.discord_username}</span>
              </div>
              <Button
                variant="ghost"
                onClick={() => { onShopLogout(); handleLinkClick(); }}
                className="justify-start text-destructive hover:text-destructive hover:bg-destructive/10 w-full px-3 py-2.5 h-auto"
              >
                <LogOut className="w-5 h-5 ml-2 flex-shrink-0" />
                <span className="text-sm">خروج</span>
              </Button>
            </>
          ) : (
            <>
              <Link
                to="/auth"
                onClick={handleLinkClick}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 ${
                  location.pathname === "/auth"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-secondary/10 text-muted-foreground"
                }`}
              >
                <LogIn className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium text-sm">دخول</span>
              </Link>
              <Link
                to="/login"
                onClick={handleLinkClick}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 ${
                  location.pathname === "/login"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-secondary/10 text-muted-foreground"
                }`}
              >
                <Settings className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium text-sm">المالك</span>
              </Link>
            </>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
};

export default MobileMenu;
