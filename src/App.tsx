import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ShopProvider } from "@/context/ShopContext";
import { AuthProvider } from "@/context/AuthContext";
import useTheme from "@/hooks/useTheme";
import Navbar from "@/components/Navbar";
import BackgroundMedia from "@/components/BackgroundMedia";
import HomePage from "@/pages/HomePage";
import ProductsPage from "@/pages/ProductsPage";
import CartPage from "@/pages/CartPage";
import ContactPage from "@/pages/ContactPage";
import AdminPage from "@/pages/AdminPage";
import LoginPage from "@/pages/LoginPage";
import AuthPage from "@/pages/AuthPage";
import RegisterPage from "@/pages/RegisterPage";
import OrderHistoryPage from "@/pages/OrderHistoryPage";
import RulesPage from "@/pages/RulesPage";
import RecruitmentPage from "@/pages/RecruitmentPage";
import NotFound from "@/pages/NotFound";
import { supabase } from "@/integrations/supabase/client";

const ThemeInitializer = () => {
  useTheme();
  return null;
};

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <ShopProvider>
            <ThemeInitializer />
            <Toaster />
            <Sonner />
            {/* Background Media - Outside Router to prevent remounting */}
            <BackgroundMedia />
            <BrowserRouter>
              <Navbar />
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/orders" element={<OrderHistoryPage />} />
                <Route path="/rules" element={<RulesPage />} />
                <Route path="/recruitment" element={<RecruitmentPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </ShopProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
