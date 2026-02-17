import { useState, useRef, useEffect } from "react";
import { motion, useScroll, AnimatePresence } from "framer-motion";
import { Loader2, Users, ShoppingBag, UserPlus, ChevronDown, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import ProductCard from "@/components/ProductCard";
import { useShop } from "@/context/ShopContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import useTheme from "@/hooks/useTheme";

const HomePage = () => {
  const {
    products,
    loading
  } = useShop();
  const {
    isAdmin
  } = useAuth();
  const { shopName } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [discordUsername, setDiscordUsername] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);
  const [isLoggedInUser, setIsLoggedInUser] = useState(false);
  const [discordFamilyUrl, setDiscordFamilyUrl] = useState("https://discord.gg/BuymXGjbdU");
  const [discordShopUrl, setDiscordShopUrl] = useState("https://discord.gg/xVntJmJZ2f");
  const {
    toast
  } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    scrollYProgress
  } = useScroll({
    container: containerRef
  });

  // Check if regular user is logged in (not admin)
  useEffect(() => {
    const shopUser = localStorage.getItem("shop_user");
    if (shopUser && !isAdmin) {
      setIsLoggedInUser(true);
    } else {
      setIsLoggedInUser(false);
    }
  }, [isAdmin]);

  // Fetch discord URLs from settings
  useEffect(() => {
    const fetchDiscordUrls = async () => {
      try {
        const { data } = await supabase
          .from("site_settings")
          .select("key, value")
          .in("key", ["discord_family_url", "discord_shop_url"]);
        data?.forEach((s: { key: string; value: unknown }) => {
          if (s.key === "discord_family_url" && typeof s.value === "string" && s.value) setDiscordFamilyUrl(s.value);
          if (s.key === "discord_shop_url" && typeof s.value === "string" && s.value) setDiscordShopUrl(s.value);
        });
      } catch (e) { console.error(e); }
    };
    fetchDiscordUrls();
  }, []);

  // Determine if registration section should be shown
  const showRegistration = !isLoggedInUser || isAdmin;
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({
        title: "خطأ",
        description: "كلمات المرور غير متطابقة",
        variant: "destructive"
      });
      return;
    }
    if (password.length < 6) {
      toast({
        title: "خطأ",
        description: "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
        variant: "destructive"
      });
      return;
    }
    if (!discordUsername.startsWith("@")) {
      toast({
        title: "خطأ",
        description: "يوزر Discord يجب أن يبدأ بـ @",
        variant: "destructive"
      });
      return;
    }
    setRegisterLoading(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke("register-user", {
        body: {
          email,
          password,
          discord_username: discordUsername
        }
      });
      if (error) throw error;
      if (data.error) {
        toast({
          title: "خطأ",
          description: data.error,
          variant: "destructive"
        });
        return;
      }
      toast({
        title: "تم التسجيل بنجاح!",
        description: "انتظر تفعيل حسابك من المالك"
      });
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setDiscordUsername("");
    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء التسجيل",
        variant: "destructive"
      });
    } finally {
      setRegisterLoading(false);
    }
  };
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    element?.scrollIntoView({
      behavior: "smooth"
    });
  };
  return <div ref={containerRef} className="h-screen overflow-y-auto scroll-smooth snap-y snap-mandatory">
      {/* Progress Bar */}
      <motion.div className="fixed top-0 left-0 right-0 h-1 bg-primary z-50 origin-left" style={{
      scaleX: scrollYProgress
    }} />

      {/* Hero Section */}
      <section id="hero" className="min-h-screen snap-start flex flex-col items-center justify-center relative overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
        
        <motion.div initial={{
        opacity: 0,
        y: 50
      }} whileInView={{
        opacity: 1,
        y: 0
      }} transition={{
        duration: 0.8,
        ease: "easeOut"
      }} viewport={{
        once: true
      }} className="container mx-auto px-4 text-center relative z-10">
          <motion.h1 initial={{
          opacity: 0,
          scale: 0.8
        }} whileInView={{
          opacity: 1,
          scale: 1
        }} transition={{
          duration: 0.6,
          delay: 0.2
        }} viewport={{
          once: true
        }} className="text-5xl md:text-7xl font-extrabold mb-6">
            <span className="text-gradient font-serif text-right">{shopName || "Walker Family Shop"}</span>
          </motion.h1>
          
          <motion.p initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.6,
          delay: 0.4
        }} viewport={{
          once: true
        }} className="text-xl text-muted-foreground max-w-2xl mx-auto mb-6 font-mono">
            
مرحباً بكم في متجر Walker Family - نوفر لكم أفضل المنتجات بأفضل الأسعار








          </motion.p>
          
          {/* Owner & Team */}
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.6,
          delay: 0.6
        }} viewport={{
          once: true
        }} className="flex flex-col items-center gap-3 mb-8">
            <div className="flex items-center gap-2 bg-primary/10 px-6 py-3 rounded-full border border-primary/20">
              <span className="text-muted-foreground">مالك المتجر:</span>
              <span className="font-bold text-primary text-lg">@w8jl</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>شركاء:</span>
              <div className="flex gap-2">
                <span className="bg-secondary px-3 py-1 rounded-full text-secondary-foreground font-medium">@s_h0.</span>
                <span className="bg-secondary px-3 py-1 rounded-full text-secondary-foreground font-medium">@3.bb3</span>
              </div>
            </div>
          </motion.div>
          
          {/* Discord Links */}
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.6,
          delay: 0.8
        }} viewport={{
          once: true
        }} className="flex flex-col sm:flex-row gap-4 justify-center items-center opacity-100 shadow-none">
            <a href={discordFamilyUrl} target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                <Users className="w-6 h-6" />
                انضم لسيرفر العائلة
              </Button>
            </a>
            <a href={discordShopUrl} target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="outline" className="gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                <ShoppingBag className="w-6 h-6" />
                سيرفر المتجر
              </Button>
            </a>
          </motion.div>

          {/* Note for scrolling */}
          {showRegistration && <motion.div initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.6,
          delay: 1
        }} viewport={{
          once: true
        }} className="mt-8 flex items-center justify-center gap-2 text-muted-foreground">
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-sm">ملاحظة: يرجى التمرير للصفحة التالية للتسجيل</span>
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            </motion.div>}
        </motion.div>

        {/* Scroll Indicator */}
        <motion.button onClick={() => scrollToSection(showRegistration ? "register" : "products")} initial={{
        opacity: 0
      }} animate={{
        opacity: 1,
        y: [0, 10, 0]
      }} transition={{
        opacity: {
          delay: 1.5,
          duration: 0.5
        },
        y: {
          repeat: Infinity,
          duration: 1.5,
          ease: "easeInOut"
        }
      }} className="absolute bottom-8 left-1/2 -translate-x-1/2 text-muted-foreground hover:text-primary transition-colors">
          <ChevronDown className="w-10 h-10" />
        </motion.button>
      </section>

      {/* Registration Section - Hidden for logged-in regular users */}
      <AnimatePresence>
        {showRegistration && <motion.section id="register" initial={{
        opacity: 0,
        scale: 0.95
      }} animate={{
        opacity: 1,
        scale: 1
      }} exit={{
        opacity: 0,
        scale: 0.95,
        height: 0
      }} transition={{
        duration: 0.8,
        ease: [0.22, 1, 0.36, 1]
      }} className="min-h-screen snap-start flex items-center justify-center py-20 relative overflow-hidden">
            {/* Background with particles effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/30 to-background" />
            <div className="absolute inset-0 opacity-30">
              {[...Array(20)].map((_, i) => <motion.div key={i} className="absolute w-2 h-2 bg-primary/20 rounded-full" style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`
          }} animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.8, 0.2]
          }} transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2
          }} />)}
            </div>
            
            <motion.div initial={{
          opacity: 0,
          y: 100,
          rotateX: -10
        }} whileInView={{
          opacity: 1,
          y: 0,
          rotateX: 0
        }} transition={{
          duration: 1,
          ease: [0.22, 1, 0.36, 1]
        }} viewport={{
          once: true,
          margin: "-100px"
        }} className="container mx-auto px-4 relative z-10">
              <div className="max-w-md mx-auto perspective-1000">
                <motion.div initial={{
              opacity: 0,
              y: 50,
              scale: 0.9
            }} whileInView={{
              opacity: 1,
              y: 0,
              scale: 1
            }} transition={{
              duration: 0.8,
              delay: 0.2,
              ease: [0.22, 1, 0.36, 1]
            }} viewport={{
              once: true
            }} whileHover={{
              y: -5,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
            }}>
                  <Card className="border-primary/20 shadow-2xl backdrop-blur-sm bg-card/90 overflow-hidden">
                    {/* Glow effect */}
                    <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/20 rounded-full blur-3xl" />
                    <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
                    
                    <CardHeader className="text-center relative">
                      <motion.div initial={{
                    scale: 0,
                    rotate: -180
                  }} whileInView={{
                    scale: 1,
                    rotate: 0
                  }} transition={{
                    duration: 0.6,
                    delay: 0.4,
                    type: "spring",
                    stiffness: 200
                  }} viewport={{
                    once: true
                  }}>
                        <CardTitle className="text-2xl font-bold">إنشاء حساب جديد</CardTitle>
                      </motion.div>
                      <CardDescription>أنشئ حسابك وانتظر تفعيله من المالك</CardDescription>
                    </CardHeader>
                    
                    <form onSubmit={handleRegister}>
                      <CardContent className="space-y-4 relative">
                        {[{
                      id: "discord",
                      label: "يوزر Discord",
                      placeholder: "@username",
                      value: discordUsername,
                      onChange: setDiscordUsername,
                      delay: 0.5
                    }, {
                      id: "email",
                      label: "البريد الإلكتروني",
                      placeholder: "example@email.com",
                      value: email,
                      onChange: setEmail,
                      delay: 0.6,
                      type: "email"
                    }, {
                      id: "password",
                      label: "كلمة المرور",
                      placeholder: "••••••••",
                      value: password,
                      onChange: setPassword,
                      delay: 0.7,
                      type: "password"
                    }, {
                      id: "confirmPassword",
                      label: "تأكيد كلمة المرور",
                      placeholder: "••••••••",
                      value: confirmPassword,
                      onChange: setConfirmPassword,
                      delay: 0.8,
                      type: "password"
                    }].map(field => <motion.div key={field.id} initial={{
                      opacity: 0,
                      x: -30
                    }} whileInView={{
                      opacity: 1,
                      x: 0
                    }} transition={{
                      duration: 0.5,
                      delay: field.delay,
                      ease: [0.22, 1, 0.36, 1]
                    }} viewport={{
                      once: true
                    }} className="space-y-2">
                            <Label htmlFor={field.id}>{field.label}</Label>
                            <Input id={field.id} type={field.type || "text"} placeholder={field.placeholder} value={field.value} onChange={e => field.onChange(e.target.value)} required dir="ltr" className="transition-all duration-300 focus:scale-[1.02] focus:shadow-lg" />
                          </motion.div>)}
                      </CardContent>
                      
                      <CardFooter className="flex flex-col gap-4">
                        <motion.div initial={{
                      opacity: 0,
                      y: 20
                    }} whileInView={{
                      opacity: 1,
                      y: 0
                    }} transition={{
                      duration: 0.5,
                      delay: 0.9,
                      ease: [0.22, 1, 0.36, 1]
                    }} viewport={{
                      once: true
                    }} className="w-full">
                          <Button type="submit" className="w-full relative overflow-hidden group" disabled={registerLoading}>
                            <span className="relative z-10 flex items-center justify-center">
                              {registerLoading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <UserPlus className="w-4 h-4 ml-2" />}
                              إنشاء حساب
                            </span>
                            <motion.div className="absolute inset-0 bg-primary-foreground/10" initial={{
                          x: "-100%"
                        }} whileHover={{
                          x: "100%"
                        }} transition={{
                          duration: 0.5
                        }} />
                          </Button>
                        </motion.div>
                        <motion.p initial={{
                      opacity: 0
                    }} whileInView={{
                      opacity: 1
                    }} transition={{
                      delay: 1
                    }} viewport={{
                      once: true
                    }} className="text-sm text-muted-foreground text-center">
                          لديك حساب؟{" "}
                          <Link to="/auth" className="text-primary hover:underline">
                            تسجيل الدخول
                          </Link>
                        </motion.p>
                      </CardFooter>
                    </form>
                  </Card>
                </motion.div>
              </div>
            </motion.div>

            {/* Scroll Indicator */}
            <motion.button onClick={() => scrollToSection("products")} initial={{
          opacity: 0
        }} whileInView={{
          opacity: 1
        }} transition={{
          delay: 1
        }} viewport={{
          once: true
        }} animate={{
          y: [0, 10, 0]
        }} className="absolute bottom-8 left-1/2 -translate-x-1/2 text-muted-foreground hover:text-primary transition-colors">
              <ChevronDown className="w-10 h-10" />
            </motion.button>
          </motion.section>}
      </AnimatePresence>

      {/* Products Section */}
      <section id="products" className="min-h-screen snap-start py-20 relative">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
        
        <div className="container mx-auto px-4 relative z-10">
          <motion.h2 initial={{
          opacity: 0,
          y: -30
        }} whileInView={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.6
        }} viewport={{
          once: true
        }} className="text-4xl font-bold text-foreground mb-12 text-center">
            <span className="text-gradient">منتجاتنا</span>
          </motion.h2>
          
          {loading ? <div className="flex justify-center py-20">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
            </div> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product, index) => <motion.div key={product.id} initial={{
            opacity: 0,
            y: 50,
            scale: 0.9
          }} whileInView={{
            opacity: 1,
            y: 0,
            scale: 1
          }} transition={{
            duration: 0.5,
            delay: index * 0.1,
            ease: "easeOut"
          }} viewport={{
            once: true,
            margin: "-50px"
          }} whileHover={{
            y: -10,
            transition: {
              duration: 0.2
            }
          }}>
                  <ProductCard product={product} />
                </motion.div>)}
            </div>}
        </div>
      </section>
    </div>;
};
export default HomePage;