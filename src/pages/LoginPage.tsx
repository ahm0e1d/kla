import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Mail, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
const authSchema = z.object({
  email: z.string().trim().email({
    message: "البريد الإلكتروني غير صالح"
  }),
  password: z.string().min(6, {
    message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل"
  })
});
const LoginPage = () => {
  const {
    user,
    isAdmin,
    loading,
    signIn,
    signUp
  } = useAuth();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => {
    if (!loading && user && isAdmin) {
      navigate("/admin");
    }
  }, [user, isAdmin, loading, navigate]);
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = authSchema.safeParse({
      email,
      password
    });
    if (!validation.success) {
      toast({
        title: "خطأ",
        description: validation.error.errors[0].message,
        variant: "destructive"
      });
      return;
    }
    setIsLoading(true);
    const {
      error
    } = await signIn(email.trim(), password);
    setIsLoading(false);
    if (error) {
      toast({
        title: "خطأ في تسجيل الدخول",
        description: error.message === "Invalid login credentials" ? "البريد الإلكتروني أو كلمة المرور غير صحيحة" : error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "مرحباً بك",
        description: "تم تسجيل الدخول بنجاح"
      });
    }
  };
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = authSchema.safeParse({
      email,
      password
    });
    if (!validation.success) {
      toast({
        title: "خطأ",
        description: validation.error.errors[0].message,
        variant: "destructive"
      });
      return;
    }
    setIsLoading(true);
    const {
      error
    } = await signUp(email.trim(), password);
    setIsLoading(false);
    if (error) {
      const message = error.message === "User already registered" ? "هذا البريد الإلكتروني مسجل بالفعل" : error.message;
      toast({
        title: "خطأ في التسجيل",
        description: message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "تم التسجيل",
        description: "تم إنشاء حسابك بنجاح. يمكنك الآن تسجيل الدخول."
      });
    }
  };
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>;
  }
  return <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md p-8 bg-card border-border animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
            <Lock className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">دخول المالك</h1>
          <p className="text-muted-foreground">سجّل دخولك للوصول إلى لوحة التحكم</p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="login">تسجيل الدخول</TabsTrigger>
            <TabsTrigger value="register">حساب جديد</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleSignIn} className="space-y-6">
              <div>
                <Label htmlFor="login-email" className="flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4" />
                  البريد الإلكتروني
                </Label>
                <Input id="login-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="أدخل البريد الإلكتروني" className="bg-input border-border text-right" autoComplete="email" dir="ltr" />
              </div>

              <div>
                <Label htmlFor="login-password" className="flex items-center gap-2 mb-2">
                  <Lock className="w-4 h-4" />
                  كلمة المرور
                </Label>
                <Input id="login-password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="أدخل كلمة المرور" className="bg-input border-border text-right" autoComplete="current-password" />
              </div>

              <Button type="submit" disabled={isLoading} className="w-full bg-primary hover:bg-primary/80 text-primary-foreground font-semibold py-6 text-lg">
                <LogIn className="w-5 h-5 ml-2" />
                {isLoading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="register">
            <form onSubmit={handleSignUp} className="space-y-6">
              <div>
                <Label htmlFor="register-email" className="flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4" />
                  البريد الإلكتروني
                </Label>
                <Input id="register-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="أدخل البريد الإلكتروني" className="bg-input border-border text-right" autoComplete="email" dir="ltr" />
              </div>

              <div>
                <Label htmlFor="register-password" className="flex items-center gap-2 mb-2">
                  <Lock className="w-4 h-4" />
                  كلمة المرور
                </Label>
                <Input id="register-password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="6 أحرف على الأقل" className="bg-input border-border text-right" autoComplete="new-password" />
              </div>

              <Button type="submit" disabled={isLoading} className="w-full bg-primary hover:bg-primary/80 text-primary-foreground font-semibold py-6 text-lg">
                <UserPlus className="w-5 h-5 ml-2" />
                {isLoading ? "جاري التسجيل..." : "إنشاء حساب"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <p className="text-center text-sm text-muted-foreground mt-6">ملاحظة: بعد التسجيل، تواصل مع المالك لمنحك صلاحيات الإدارة , ويمنع على الافراد بتسجيل حساب ادارة في حال عدم تكليفهم بأي مسؤولية لانه سيعرضهم الى البلاك ليست</p>
      </Card>
    </div>;
};
export default LoginPage;