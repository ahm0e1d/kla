import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Info, CheckCircle, AlertTriangle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Notification sound URL (using a simple bell sound)
const NOTIFICATION_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
  created_at: string;
  is_active?: boolean;
}

const NotificationBell = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);
  const isMobile = useIsMobile();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousCountRef = useRef<number>(0);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
    audioRef.current.volume = 0.5;
  }, []);

  // Play sound when new announcements arrive
  const playNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(console.error);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
    const saved = localStorage.getItem("read_announcements");
    if (saved) {
      setReadIds(JSON.parse(saved));
    }

    // Set up realtime subscription for new announcements
    const channel = supabase
      .channel("announcements-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "announcements",
        },
        (payload) => {
          const newAnnouncement = payload.new as Announcement;
          if (newAnnouncement.is_active !== false) {
            setAnnouncements((prev) => [newAnnouncement, ...prev]);
            playNotificationSound();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from("announcements")
        .select("id, title, content, type, created_at")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching announcements:", error);
        return;
      }
      
      const now = new Date();
      const validAnnouncements = (data || []).filter((a: any) => {
        if (!a.expires_at) return true;
        return new Date(a.expires_at) > now;
      });
      
      setAnnouncements(validAnnouncements);
    } catch (error) {
      console.error("Error fetching announcements:", error);
    }
  };

  const markAsRead = (id: string) => {
    const newReadIds = [...readIds, id];
    setReadIds(newReadIds);
    localStorage.setItem("read_announcements", JSON.stringify(newReadIds));
  };

  const markAllAsRead = () => {
    const allIds = announcements.map(a => a.id);
    setReadIds(allIds);
    localStorage.setItem("read_announcements", JSON.stringify(allIds));
  };

  const unreadCount = announcements.filter(a => !readIds.includes(a.id)).length;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "success": return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "warning": return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case "error": return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getTypeBg = (type: string) => {
    switch (type) {
      case "success": return "bg-green-500/10 border-green-500/30";
      case "warning": return "bg-yellow-500/10 border-yellow-500/30";
      case "error": return "bg-red-500/10 border-red-500/30";
      default: return "bg-blue-500/10 border-blue-500/30";
    }
  };

  const BellButton = (
    <Button variant="ghost" size="icon" className="relative">
      <Bell className="w-5 h-5" />
      <AnimatePresence>
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute -top-1 -right-1"
          >
            <Badge 
              variant="destructive" 
              className="h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount}
            </Badge>
          </motion.div>
        )}
      </AnimatePresence>
    </Button>
  );

  const AnnouncementsList = (
    <>
      <div className="flex items-center justify-between p-3 border-b">
        <h4 className="font-semibold">الإعلانات</h4>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs">
            تحديد الكل كمقروء
          </Button>
        )}
      </div>
      <ScrollArea className="h-[300px]">
        {announcements.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            <Bell className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>لا توجد إعلانات</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {announcements.map((announcement) => {
              const isRead = readIds.includes(announcement.id);
              return (
                <motion.div
                  key={announcement.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-3 hover:bg-muted/50 transition-colors cursor-pointer ${!isRead ? 'bg-primary/5' : ''}`}
                  onClick={() => markAsRead(announcement.id)}
                >
                  <div className="flex gap-3">
                    <div className={`p-2 rounded-full ${getTypeBg(announcement.type)} shrink-0`}>
                      {getTypeIcon(announcement.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h5 className="font-medium text-sm truncate">{announcement.title}</h5>
                        {!isRead && (
                          <span className="w-2 h-2 bg-primary rounded-full shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {announcement.content}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {new Date(announcement.created_at).toLocaleDateString("ar")}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </>
  );

  // Use Drawer for mobile, Popover for desktop
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerTrigger asChild>
          {BellButton}
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader className="border-b-0 pb-0">
            <DrawerTitle className="sr-only">الإعلانات</DrawerTitle>
          </DrawerHeader>
          {AnnouncementsList}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {BellButton}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        {AnnouncementsList}
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
