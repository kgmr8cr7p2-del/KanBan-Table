"use client";

import { useEffect, useRef } from "react";

const REPORT_KEY_PREFIX = "team-kanban-weekly-report-sent";
const MOSCOW_TIME_ZONE = "Europe/Moscow";

export function WeeklyReportReminder() {
  const sentRef = useRef(false);

  useEffect(() => {
    const sendReport = async () => {
      if (sentRef.current) return;
      sentRef.current = true;
      try {
        await fetch("/api/reports/weekly", { method: "POST" });
      } catch {
        // Best-effort; board works without the report.
      }
    };

    const checkSchedule = () => {
      const event = getFridayReportEvent();
      if (!event) return;

      const storageKey = `${REPORT_KEY_PREFIX}-${event.key}`;
      if (window.sessionStorage.getItem(storageKey)) return;

      window.sessionStorage.setItem(storageKey, "sent");
      void sendReport();
    };

    const checkImmediate = () => {
      const now = new Date();
      const parts = getMoscowParts(now);
      const dayOfWeek = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();

      // Only on Friday, past 16:40
      if (dayOfWeek !== 5) return;
      const currentSeconds = parts.hour * 3600 + parts.minute * 60 + parts.second;
      const targetSeconds = 16 * 3600 + 40 * 60;
      if (currentSeconds < targetSeconds) return;

      const storageKey = `${REPORT_KEY_PREFIX}-${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}-16-40`;
      if (window.sessionStorage.getItem(storageKey)) return;

      window.sessionStorage.setItem(storageKey, "sent");
      void sendReport();
    };

    const visibilityHandler = () => {
      if (document.visibilityState === "visible") {
        checkImmediate();
        checkSchedule();
      }
    };
    document.addEventListener("visibilitychange", visibilityHandler);

    checkImmediate();
    checkSchedule();
    const timer = window.setInterval(checkSchedule, 1000);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", visibilityHandler);
    };
  }, []);

  return null;
}

function getFridayReportEvent() {
  const now = new Date();
  const parts = getMoscowParts(now);
  const dayOfWeek = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
  if (dayOfWeek !== 5) return null;

  if (parts.hour !== 16 || parts.minute !== 40) return null;

  return {
    key: `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}-16-40`,
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
