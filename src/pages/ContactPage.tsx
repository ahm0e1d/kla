import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { sendComplaintWebhook } from "@/lib/webhooks";

const ContactPage = () => {
  const { toast } = useToast();
  const [characterName, setCharacterName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [discordUsername, setDiscordUsername] = useState("");
  const [complaint, setComplaint] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!characterName || !accountName || !discordUsername || !complaint) {
      toast({
        title: "خطأ",
        description: "الرجاء ملء جميع الحقول",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    // Generate complaint ID
    const complaintId = "CMP-" + Math.random().toString(36).substring(2, 8).toUpperCase();

    await sendComplaintWebhook({ complaintId, characterName, accountName, discordUsername, complaint });

    setIsSubmitting(false);
    toast({
      title: "تم الإرسال",
      description: "تم إرسال شكواك بنجاح، سنتواصل معك قريباً",
    });

    setCharacterName("");
    setAccountName("");
    setDiscordUsername("");
    setComplaint("");
  };

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <h1 className="text-4xl font-bold text-foreground mb-8 text-center">الشكاوى</h1>

        <Card className="p-8 bg-card border-border">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="characterName">اسم الشخصية</Label>
                <Input
                  id="characterName"
                  value={characterName}
                  onChange={(e) => setCharacterName(e.target.value)}
                  placeholder="أدخل اسم الشخصية"
                  className="bg-input border-border"
                />
              </div>
              <div>
                <Label htmlFor="accountName">اسم الحساب</Label>
                <Input
                  id="accountName"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="أدخل اسم الحساب"
                  className="bg-input border-border"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="discordUsername">يوزر الديسكورد</Label>
              <Input
                id="discordUsername"
                value={discordUsername}
                onChange={(e) => setDiscordUsername(e.target.value)}
                placeholder="أدخل يوزر الديسكورد"
                className="bg-input border-border"
              />
            </div>

            <div>
              <Label htmlFor="complaint">الشكوى</Label>
              <Textarea
                id="complaint"
                value={complaint}
                onChange={(e) => setComplaint(e.target.value)}
                placeholder="اكتب شكواك هنا..."
                rows={6}
                className="bg-input border-border"
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary hover:bg-primary/80 text-primary-foreground font-semibold py-6 text-lg"
            >
              <Send className="w-5 h-5 ml-2" />
              {isSubmitting ? "جاري الإرسال..." : "إرسال الشكوى"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default ContactPage;
