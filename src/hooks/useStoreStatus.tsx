import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface StoreHours {
  openTime: string;
  closeTime: string;
  workingDays: number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
}

interface ShiftTimes {
  morningStart: string;
  morningEnd: string;
  eveningStart: string;
  eveningEnd: string;
}

interface StoreStatusResult {
  isOpen: boolean;
  storeHours: StoreHours | null;
  shiftTimes: ShiftTimes | null;
  loading: boolean;
  isVacation: boolean;
  vacationMessage: string | null;
  morningShiftEnabled: boolean;
  eveningShiftEnabled: boolean;
  customDiscordMessage: string | null;
}

export const useStoreStatus = (): StoreStatusResult => {
  const [storeHours, setStoreHours] = useState<StoreHours | null>(null);
  const [shiftTimes, setShiftTimes] = useState<ShiftTimes | null>(null);
  const [loading, setLoading] = useState(true);
  const [isVacation, setIsVacation] = useState(false);
  const [vacationMessage, setVacationMessage] = useState<string | null>(null);
  const [morningShiftEnabled, setMorningShiftEnabled] = useState(true);
  const [eveningShiftEnabled, setEveningShiftEnabled] = useState(true);
  const [customDiscordMessage, setCustomDiscordMessage] = useState<string | null>(null);

  const fetchStoreHours = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .in("key", [
          "store_open_time", 
          "store_close_time", 
          "store_working_days",
          "store_vacation_mode",
          "store_vacation_message",
          "morning_shift_enabled",
          "evening_shift_enabled",
          "morning_shift_start",
          "morning_shift_end",
          "evening_shift_start",
          "evening_shift_end",
          "store_discord_message"
        ]);

      if (error) throw error;

      let openTime = "";
      let closeTime = "";
      let workingDays: number[] = [0, 1, 2, 3, 4, 5, 6]; // Default: all days
      let vacation = false;
      let vacationMsg: string | null = null;
      let morningEnabled = true;
      let eveningEnabled = true;
      let discordMsg: string | null = null;
      let morningStart = "08:00";
      let morningEnd = "14:00";
      let eveningStart = "16:00";
      let eveningEnd = "22:00";

      data?.forEach((setting: { key: string; value: unknown }) => {
        if (setting.key === "store_open_time") {
          openTime = setting.value as string;
        } else if (setting.key === "store_close_time") {
          closeTime = setting.value as string;
        } else if (setting.key === "store_working_days") {
          workingDays = setting.value as number[];
        } else if (setting.key === "store_vacation_mode") {
          vacation = setting.value as boolean;
        } else if (setting.key === "store_vacation_message") {
          vacationMsg = setting.value as string;
        } else if (setting.key === "morning_shift_enabled") {
          morningEnabled = setting.value as boolean;
        } else if (setting.key === "evening_shift_enabled") {
          eveningEnabled = setting.value as boolean;
        } else if (setting.key === "morning_shift_start") {
          morningStart = setting.value as string;
        } else if (setting.key === "morning_shift_end") {
          morningEnd = setting.value as string;
        } else if (setting.key === "evening_shift_start") {
          eveningStart = setting.value as string;
        } else if (setting.key === "evening_shift_end") {
          eveningEnd = setting.value as string;
        } else if (setting.key === "store_discord_message") {
          discordMsg = setting.value as string;
        }
      });

      if (openTime && closeTime) {
        setStoreHours({ openTime, closeTime, workingDays });
      } else {
        setStoreHours(null);
      }
      
      setShiftTimes({ morningStart, morningEnd, eveningStart, eveningEnd });
      setIsVacation(vacation);
      setVacationMessage(vacationMsg);
      setMorningShiftEnabled(morningEnabled);
      setEveningShiftEnabled(eveningEnabled);
      setCustomDiscordMessage(discordMsg);
    } catch (error) {
      console.error("Error fetching store hours:", error);
      setStoreHours(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStoreHours();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("store-hours-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "site_settings",
        },
        (payload) => {
          const key = (payload.new as { key?: string })?.key;
          if (
            key === "store_open_time" || 
            key === "store_close_time" || 
            key === "store_working_days" ||
            key === "store_vacation_mode" ||
            key === "store_vacation_message" ||
            key === "morning_shift_enabled" ||
            key === "evening_shift_enabled" ||
            key === "morning_shift_start" ||
            key === "morning_shift_end" ||
            key === "evening_shift_start" ||
            key === "evening_shift_end" ||
            key === "store_discord_message"
          ) {
            fetchStoreHours();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchStoreHours]);

  // Check if store is currently open based on shift times
  const checkIfOpen = useCallback((): boolean => {
    // If vacation mode is on, store is closed
    if (isVacation) return false;
    
    // If both shifts are disabled, store is closed
    if (!morningShiftEnabled && !eveningShiftEnabled) return false;
    
    // If no shift times, store is always open
    if (!shiftTimes) return true;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    // Parse shift times
    const [morningStartHour, morningStartMin] = shiftTimes.morningStart.split(":").map(Number);
    const [morningEndHour, morningEndMin] = shiftTimes.morningEnd.split(":").map(Number);
    const [eveningStartHour, eveningStartMin] = shiftTimes.eveningStart.split(":").map(Number);
    const [eveningEndHour, eveningEndMin] = shiftTimes.eveningEnd.split(":").map(Number);

    const morningStartMinutes = morningStartHour * 60 + morningStartMin;
    const morningEndMinutes = morningEndHour * 60 + morningEndMin;
    const eveningStartMinutes = eveningStartHour * 60 + eveningStartMin;
    const eveningEndMinutes = eveningEndHour * 60 + eveningEndMin;

    // Check if current time is within any active shift
    // When both shifts enabled: open during morning shift, CLOSED between shifts, open during evening shift
    // If only morning enabled: from morningStart to morningEnd
    // If only evening enabled: from eveningStart to eveningEnd
    
    if (morningShiftEnabled && eveningShiftEnabled) {
      const inMorningShift = currentTime >= morningStartMinutes && currentTime < morningEndMinutes;
      // Handle overnight evening shift (e.g., 18:00 - 00:00)
      let inEveningShift = false;
      if (eveningEndMinutes <= eveningStartMinutes) {
        inEveningShift = currentTime >= eveningStartMinutes || currentTime < eveningEndMinutes;
      } else {
        inEveningShift = currentTime >= eveningStartMinutes && currentTime < eveningEndMinutes;
      }
      return inMorningShift || inEveningShift;
    } else if (morningShiftEnabled) {
      return currentTime >= morningStartMinutes && currentTime < morningEndMinutes;
    } else if (eveningShiftEnabled) {
      if (eveningEndMinutes <= eveningStartMinutes) {
        return currentTime >= eveningStartMinutes || currentTime < eveningEndMinutes;
      }
      return currentTime >= eveningStartMinutes && currentTime < eveningEndMinutes;
    }

    return false;
  }, [shiftTimes, isVacation, morningShiftEnabled, eveningShiftEnabled]);

  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    if (!loading) {
      setIsOpen(checkIfOpen());

      // Update every minute
      const interval = setInterval(() => {
        setIsOpen(checkIfOpen());
      }, 60000);

      return () => clearInterval(interval);
    }
  }, [loading, checkIfOpen]);

  return { 
    isOpen, 
    storeHours, 
    shiftTimes,
    loading, 
    isVacation, 
    vacationMessage, 
    morningShiftEnabled,
    eveningShiftEnabled,
    customDiscordMessage 
  };
};
