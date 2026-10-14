"use client";

import { useEffect } from "react";
import { setSoundPreferenceUser, cacheSoundPreferences } from "@/lib/chat-notification";

export function SoundPreferenceSync({ userId }: { userId: string }) {
  useEffect(() => {
    setSoundPreferenceUser(userId);
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch("/api/notification-preferences", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (active) cacheSoundPreferences(data.preferences?.soundPreferences);
      } catch { /* The cached preferences remain available offline. */ }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 30000);
    window.addEventListener("focus", refresh);
    const storage = (event: StorageEvent) => {
      if (event.key !== `taskora-sounds:${userId}`) return;
      try { cacheSoundPreferences(JSON.parse(event.newValue || "null")); } catch { /* Ignore invalid external storage data. */ }
    };
    window.addEventListener("storage", storage);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener("focus", refresh); window.removeEventListener("storage", storage); };
  }, [userId]);
  return null;
}
