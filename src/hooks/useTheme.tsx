import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const THEME_COLORS: Record<string, { primary: string; accent: string; secondary: string; border: string; ring: string }> = {
  red: { 
    primary: "0 72% 50%", 
    accent: "45 100% 50%", 
    secondary: "0 65% 40%",
    border: "0 50% 30%",
    ring: "0 72% 50%"
  },
  blue: { 
    primary: "220 70% 50%", 
    accent: "180 100% 50%", 
    secondary: "220 60% 40%",
    border: "220 50% 30%",
    ring: "220 70% 50%"
  },
  green: { 
    primary: "140 70% 40%", 
    accent: "60 100% 50%", 
    secondary: "140 60% 30%",
    border: "140 50% 25%",
    ring: "140 70% 40%"
  },
  purple: { 
    primary: "270 70% 50%", 
    accent: "300 100% 60%", 
    secondary: "270 60% 40%",
    border: "270 50% 30%",
    ring: "270 70% 50%"
  },
  orange: { 
    primary: "25 90% 50%", 
    accent: "45 100% 50%", 
    secondary: "25 80% 40%",
    border: "25 70% 30%",
    ring: "25 90% 50%"
  },
  teal: { 
    primary: "175 70% 40%", 
    accent: "200 100% 50%", 
    secondary: "175 60% 30%",
    border: "175 50% 25%",
    ring: "175 70% 40%"
  },
};

export const useTheme = () => {
  const [themeColor, setThemeColor] = useState<string>("red");
  const [shopName, setShopName] = useState<string>("Walker Family Shop");
  const [logoUrl, setLogoUrl] = useState<string>("");

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    applyTheme(themeColor);
  }, [themeColor]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("key, value");

      if (error) throw error;

      if (data) {
        data.forEach((setting: { key: string; value: unknown }) => {
          if (setting.key === "theme_color" && typeof setting.value === "string") {
            setThemeColor(setting.value);
          }
          if (setting.key === "shop_name" && typeof setting.value === "string") {
            setShopName(setting.value);
          }
          if (setting.key === "logo_url" && typeof setting.value === "string") {
            setLogoUrl(setting.value);
          }
        });
      }
    } catch (error) {
      console.error("Error fetching theme settings:", error);
    }
  };

  const applyTheme = (colorId: string) => {
    const colors = THEME_COLORS[colorId] || THEME_COLORS.red;
    const root = document.documentElement;
    
    root.style.setProperty("--primary", colors.primary);
    root.style.setProperty("--secondary", colors.secondary);
    root.style.setProperty("--accent", colors.accent);
    root.style.setProperty("--border", colors.border);
    root.style.setProperty("--ring", colors.ring);
    root.style.setProperty("--sidebar-primary", colors.primary);
    root.style.setProperty("--sidebar-ring", colors.ring);
    root.style.setProperty("--sidebar-border", colors.border);
  };

  return { themeColor, shopName, logoUrl, refreshTheme: fetchSettings };
};

export default useTheme;
