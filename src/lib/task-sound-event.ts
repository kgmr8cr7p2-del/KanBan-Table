import { randomInt } from "node:crypto";
import { prisma } from "@/lib/prisma";

export type TaskSoundKind = "created" | "completed" | "reminder";

const sounds: Record<TaskSoundKind, string[]> = {
  created: [
    "/task-sounds/opiat-rabota.mp3",
    "/task-sounds/captainwhat2.mp3",
    "/task-sounds/peonready1.mp3",
    "/task-sounds/ooo-a-vot-tak-mne-nravitsja.mp3",
  ],
  completed: [
    "/completion-sounds/archerready1.mp3",
    "/completion-sounds/foresttrollyes1.mp3",
    "/completion-sounds/peasantbuildingcomplete1.mp3",
    "/completion-sounds/skibidi-dop-dop-yes-yes.mp3",
    "/completion-sounds/ura-pobeda.mp3",
  ],
  reminder: ["/goida.mp3"],
};

export async function triggerTaskSoundEvent(kind: TaskSoundKind = "created", userId: string | null = null) {
  const latest = await prisma.taskSoundEvent.findFirst({
    where: { kind, userId },
    orderBy: { createdAt: "desc" },
    select: { soundUrl: true },
  });
  const available = sounds[kind].filter((soundUrl) => soundUrl !== latest?.soundUrl);
  const choices = available.length ? available : sounds[kind];
  const soundUrl = choices[randomInt(choices.length)];

  return prisma.taskSoundEvent.create({
    data: { kind, soundUrl, userId },
  });
}

export function triggerTaskCompletionSoundEvent(userId: string | null = null) {
  return triggerTaskSoundEvent("completed", userId);
}

export function triggerTaskReminderSoundEvent(userId: string | null = null) {
  return triggerTaskSoundEvent("reminder", userId);
}

export function getRecentTaskSoundEvents(userId: string) {
  const cutoff = new Date(Date.now() - 10 * 60 * 1000);
  return prisma.taskSoundEvent.findMany({
    where: {
      createdAt: { gte: cutoff },
      OR: [{ userId: null }, { userId }],
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: 50,
    select: {
      id: true,
      kind: true,
      soundUrl: true,
      createdAt: true,
    },
  });
}
