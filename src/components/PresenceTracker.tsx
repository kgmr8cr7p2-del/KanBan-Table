"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const HEARTBEAT_MS = 25_000;
const IDLE_MS = 60_000;

export function PresenceTracker() {
  const pathname = usePathname();
  const idleRef = useRef(false);
  const lastSentRef = useRef(0);

  useEffect(() => {
    let idleTimer = 0;
    const pageActivity = activityForPath(pathname);

    function send(activity: string, force = false) {
      const now = Date.now();
      if (!force && now - lastSentRef.current < 10_000) return;
      lastSentRef.current = now;
      window.dispatchEvent(new CustomEvent("presencechange", { detail: activity }));
      void fetch("/api/presence", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ activity }),
        keepalive: true,
      }).catch(() => undefined);
    }

    function armIdleTimer() {
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        idleRef.current = true;
        send("Неактивен", true);
      }, IDLE_MS);
    }

    function markActive() {
      if (document.visibilityState !== "visible") return;
      if (idleRef.current) {
        idleRef.current = false;
        send(pageActivity, true);
      } else {
        send(pageActivity);
      }
      armIdleTimer();
    }

    function visibilityChanged() {
      if (document.visibilityState === "visible") markActive();
      else send("Отошёл", true);
    }

    function leaving() {
      send("Не в сети", true);
    }

    send(pageActivity, true);
    armIdleTimer();
    const heartbeat = window.setInterval(() => {
      send(document.visibilityState === "visible" ? (idleRef.current ? "Неактивен" : pageActivity) : "Отошёл", true);
    }, HEARTBEAT_MS);
    const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "scroll", "touchstart"];
    events.forEach((event) => window.addEventListener(event, markActive, { passive: true }));
    document.addEventListener("visibilitychange", visibilityChanged);
    window.addEventListener("beforeunload", leaving);

    return () => {
      window.clearInterval(heartbeat);
      window.clearTimeout(idleTimer);
      events.forEach((event) => window.removeEventListener(event, markActive));
      document.removeEventListener("visibilitychange", visibilityChanged);
      window.removeEventListener("beforeunload", leaving);
    };
  }, [pathname]);

  return null;
}

function activityForPath(pathname: string) {
  if (pathname.startsWith("/board")) return "Работает с доской";
  if (pathname.startsWith("/reports")) return "Смотрит отчёты";
  if (pathname.startsWith("/history")) return "Смотрит историю";
  if (pathname.startsWith("/settings")) return "В настройках";
  if (pathname.startsWith("/profile")) return "Редактирует профиль";
  if (pathname.startsWith("/archive")) return "Смотрит архив";
  return "В сети";
}
