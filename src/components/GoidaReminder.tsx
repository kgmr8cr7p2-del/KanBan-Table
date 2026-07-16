"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { playNotificationSoundFile, primeNotificationSound } from "@/lib/chat-notification";

const REMINDER_KEY_PREFIX = "team-kanban-evening-reminder";
const REMINDER_DURATION_MS = 4000;
const REMINDER_TRIGGER_WINDOW_MS = 10 * 60 * 1000;
const MOSCOW_TIME_ZONE = "Europe/Moscow";

export function GoidaReminder() {
  const [visible, setVisible] = useState(false);
  const hideTimerRef = useRef<number | null>(null);
  const pendingRef = useRef(new Map<string, string>());
  const completedRef = useRef(new Set<string>());
  const playingRef = useRef(false);

  useEffect(() => {
    const showReminder = () => {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
      setVisible(true);
      hideTimerRef.current = window.setTimeout(() => setVisible(false), REMINDER_DURATION_MS);
    };

    const flushSounds = async () => {
      if (playingRef.current) return;
      playingRef.current = true;
      try {
        for (const [eventKey, storageKey] of pendingRef.current) {
          const result = await playNotificationSoundFile("/goida.mp3");
          if (result === "blocked" || result === "failed") break;
          window.sessionStorage.setItem(storageKey, "played");
          completedRef.current.add(eventKey);
          pendingRef.current.delete(eventKey);
        }
      } finally {
        playingRef.current = false;
      }
    };

    const queueReminder = (eventKey: string) => {
      const storageKey = `${REMINDER_KEY_PREFIX}-${eventKey}`;
      if (completedRef.current.has(eventKey) || window.sessionStorage.getItem(storageKey) || pendingRef.current.has(eventKey)) return;
      pendingRef.current.set(eventKey, storageKey);
      showReminder();
      void flushSounds();
    };

    const checkReminder = () => {
      const event = getMoscowReminderEvent();
      if (event) queueReminder(event.key);
    };

    const checkServerEvent = async () => {
      try {
        const response = await fetch("/api/goida", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        const eventId = data?.event?.id;
        if (eventId && typeof eventId === "string") queueReminder(`server-${eventId}`);
      } catch {
        // The scheduled local reminder still works if the server check is temporarily unavailable.
      }
    };

    const unlockHandler = async () => {
      await primeNotificationSound();
      await flushSounds();
    };
    const visibilityHandler = () => {
      if (document.visibilityState !== "visible") return;
      checkReminder();
      void checkServerEvent();
      void flushSounds();
    };

    checkReminder();
    void checkServerEvent();
    const scheduleTimer = window.setInterval(checkReminder, 1000);
    const serverTimer = window.setInterval(() => void checkServerEvent(), 2000);
    document.addEventListener("visibilitychange", visibilityHandler);
    window.addEventListener("pointerdown", unlockHandler, { passive: true });
    window.addEventListener("keydown", unlockHandler);
    window.addEventListener("focus", unlockHandler);

    return () => {
      window.clearInterval(scheduleTimer);
      window.clearInterval(serverTimer);
      document.removeEventListener("visibilitychange", visibilityHandler);
      window.removeEventListener("pointerdown", unlockHandler);
      window.removeEventListener("keydown", unlockHandler);
      window.removeEventListener("focus", unlockHandler);
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
  }, []);

  return visible ? (
    <div className="goida-overlay" role="status" aria-live="polite">
      <div className="goida-card">
        <button className="goida-close" type="button" onClick={() => setVisible(false)} aria-label="Закрыть уведомление">
          <X size={18} />
        </button>
        <img src="/goida.gif" alt="Рабочее уведомление" />
      </div>
    </div>
  ) : null;
}

function getMoscowReminderEvent() {
  const now = new Date();
  const parts = getMoscowParts(now);
  const dayOfWeek = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
  if (dayOfWeek < 1 || dayOfWeek > 5) return null;

  const targetHour = dayOfWeek === 5 ? 16 : 18;
  const targetMinute = dayOfWeek === 5 ? 45 : 0;
  const currentSeconds = parts.hour * 3600 + parts.minute * 60 + parts.second;
  const targetSeconds = targetHour * 3600 + targetMinute * 60;
  const deltaMs = (currentSeconds - targetSeconds) * 1000;
  if (deltaMs < 0 || deltaMs > REMINDER_TRIGGER_WINDOW_MS) return null;

  return {
    key: `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}-${targetHour}-${targetMinute}`,
  };
}

function getMoscowParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: MOSCOW_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const values = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}
