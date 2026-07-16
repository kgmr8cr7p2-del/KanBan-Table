"use client";

import { useEffect, useRef } from "react";
import { playNotificationSoundFile, primeNotificationSound } from "@/lib/chat-notification";

const LAST_TASK_SOUND_EVENT_KEY = "team-kanban-last-task-sound-event";
const TASK_SOUND_LOCK_NAME = "team-kanban-task-sound-playback";
const EVENT_MAX_AGE_MS = 5 * 60 * 1000;

type TaskSoundEvent = {
  id: string;
  createdAt: string;
  soundUrl: string;
};

type TaskSoundCursor = {
  id: string;
  createdAt: number;
};

export function TaskSoundNotifier() {
  const pendingRef = useRef<TaskSoundEvent[]>([]);
  const queuedIdsRef = useRef(new Set<string>());
  const failureCountsRef = useRef(new Map<string, number>());
  const flushingRef = useRef(false);

  useEffect(() => {
    let active = true;

    const flush = async () => {
      if (!active || flushingRef.current) return;
      flushingRef.current = true;
      try {
        while (active && pendingRef.current.length) {
          const event = pendingRef.current[0];
          const outcome = await playWithCrossTabLock(event);
          if (outcome === "blocked") break;
          if (outcome === "failed") {
            const failures = (failureCountsRef.current.get(event.id) ?? 0) + 1;
            failureCountsRef.current.set(event.id, failures);
            if (failures < 3) break;
            saveCursor(event);
          }
          pendingRef.current.shift();
          queuedIdsRef.current.delete(event.id);
          failureCountsRef.current.delete(event.id);
        }
      } finally {
        flushingRef.current = false;
      }
    };

    const checkTaskSounds = async () => {
      try {
        const response = await fetch("/api/task-sound", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        const events = Array.isArray(data?.events) ? data.events as TaskSoundEvent[] : [];
        const cursor = readCursor();
        for (const event of events) {
          const createdAt = new Date(event.createdAt).getTime();
          if (!event.id || !event.soundUrl || !Number.isFinite(createdAt)) continue;
          if (Date.now() - createdAt > EVENT_MAX_AGE_MS || isAtOrBeforeCursor(event, cursor)) continue;
          if (queuedIdsRef.current.has(event.id)) continue;
          queuedIdsRef.current.add(event.id);
          pendingRef.current.push(event);
        }
        pendingRef.current.sort(compareEvents);
        await flush();
      } catch {
        // Polling retries automatically; no board action depends on sound delivery.
      }
    };

    const unlockHandler = async () => {
      await primeNotificationSound();
      await flush();
    };

    void checkTaskSounds();
    const timer = window.setInterval(() => void checkTaskSounds(), 2000);
    window.addEventListener("pointerdown", unlockHandler, { passive: true });
    window.addEventListener("keydown", unlockHandler);
    window.addEventListener("focus", unlockHandler);

    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("pointerdown", unlockHandler);
      window.removeEventListener("keydown", unlockHandler);
      window.removeEventListener("focus", unlockHandler);
    };
  }, []);

  return null;
}

async function playWithCrossTabLock(event: TaskSoundEvent) {
  const play = async () => {
    const cursor = readCursor();
    if (isAtOrBeforeCursor(event, cursor)) return "skipped" as const;
    const result = await playNotificationSoundFile(event.soundUrl);
    if (result === "played" || result === "disabled") saveCursor(event);
    return result;
  };

  if (navigator.locks) return navigator.locks.request(TASK_SOUND_LOCK_NAME, play);
  return play();
}

function compareEvents(left: TaskSoundEvent, right: TaskSoundEvent) {
  const timeDifference = new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
  return timeDifference || left.id.localeCompare(right.id);
}

function isAtOrBeforeCursor(event: TaskSoundEvent, cursor: TaskSoundCursor | null) {
  if (!cursor) return false;
  const createdAt = new Date(event.createdAt).getTime();
  return createdAt < cursor.createdAt || (createdAt === cursor.createdAt && event.id <= cursor.id);
}

function saveCursor(event: TaskSoundEvent) {
  window.localStorage.setItem(LAST_TASK_SOUND_EVENT_KEY, JSON.stringify({
    id: event.id,
    createdAt: new Date(event.createdAt).getTime(),
  }));
}

function readCursor(): TaskSoundCursor | null {
  try {
    const value = window.localStorage.getItem(LAST_TASK_SOUND_EVENT_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value);
    return typeof parsed?.id === "string" && Number.isFinite(parsed?.createdAt) ? parsed : null;
  } catch {
    return null;
  }
}
