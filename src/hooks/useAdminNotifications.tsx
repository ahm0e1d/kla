import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface NewPendingUser {
  id: string;
  email: string;
  discord_username: string;
  created_at: string;
}

// Global singleton to prevent duplicate notifications across component remounts
const notifiedUsers = new Set<string>();
let notificationAudio: HTMLAudioElement | null = null;
let isInitialized = false;

const getNotificationSound = () => {
  if (!notificationAudio) {
    notificationAudio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
    notificationAudio.volume = 0.5;
  }
  return notificationAudio;
};

export const useAdminNotifications = (
  isEnabled: boolean,
  onNewPendingUser?: (user: NewPendingUser) => void
) => {
  const { toast } = useToast();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const playNotificationSound = useCallback(() => {
    try {
      const audio = getNotificationSound();
      audio.currentTime = 0;
      audio.play().catch((err) => {
        console.log("Could not play notification sound:", err);
      });
    } catch (error) {
      console.error("Error playing notification:", error);
    }
  }, []);

  const showVisualNotification = useCallback(
    (user: NewPendingUser) => {
      toast({
        title: "🔔 طلب تفعيل جديد!",
        description: `${user.discord_username} يطلب تفعيل حسابه`,
        duration: 8000,
      });
    },
    [toast]
  );

  useEffect(() => {
    if (!isEnabled) return;

    // Prevent duplicate subscriptions
    if (channelRef.current) return;

    // Delay initialization to skip existing data on first load
    const initTimer = setTimeout(() => {
      isInitialized = true;
    }, 5000);

    channelRef.current = supabase
      .channel("admin_pending_notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "pending_users",
        },
        (payload) => {
          // Skip if not initialized yet (first load)
          if (!isInitialized) return;

          const newUser = payload.new as NewPendingUser;

          // Skip if already notified for this user (global check)
          if (notifiedUsers.has(newUser.id)) return;

          // Mark as notified globally
          notifiedUsers.add(newUser.id);

          // Play sound and show notification
          playNotificationSound();
          showVisualNotification(newUser);

          // Callback to refresh data
          onNewPendingUser?.(newUser);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(initTimer);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [isEnabled, playNotificationSound, showVisualNotification, onNewPendingUser]);

  return {
    playNotificationSound,
    showVisualNotification,
  };
};
