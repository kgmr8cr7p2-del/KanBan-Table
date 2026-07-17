import { createHash } from "node:crypto";
import { PermissionKey, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createNotifications } from "@/lib/notifications";

type SharedTaskEvent =
  | "task_created"
  | "assignee_changed"
  | "status_changed"
  | "comment_added";

const taskEventTitles: Record<SharedTaskEvent, string> = {
  task_created: "Новая задача",
  assignee_changed: "Исполнители обновлены",
  status_changed: "Статус задачи изменен",
  comment_added: "Новый комментарий",
};

export async function notifySharedTaskEvent(input: {
  event: SharedTaskEvent;
  actorId: string;
  taskId: string;
  taskNumber?: number | null;
  taskTitle: string;
  body: string;
  excludeUserIds?: string[];
}) {
  const dispatchKey = taskDispatchKey(input);
  if (!await claimTaskDispatch(dispatchKey, input)) return;

  const excludedIds = Array.from(new Set([input.actorId, ...(input.excludeUserIds ?? [])]));
  const recipients = await prisma.user.findMany({
    where: {
      id: { notIn: excludedIds },
      approvedAt: { not: null },
      emailVerifiedAt: { not: null },
      OR: [
        { role: { systemKey: "ADMIN" } },
        { role: { permissions: { has: PermissionKey.VIEW_BOARD } } },
      ],
    },
    select: { id: true },
  });
  if (!recipients.length) return;

  const taskLabel = input.taskNumber ? `#${input.taskNumber} ${input.taskTitle}` : input.taskTitle;
  try {
    await createNotifications(recipients.map((recipient) => ({
      userId: recipient.id,
      type: "SYSTEM" as const,
      category: "task" as const,
      title: taskEventTitles[input.event],
      body: `${taskLabel}: ${compactNotificationBody(input.body)}`,
      href: `/board?task=${encodeURIComponent(input.taskId)}`,
    })));
  } catch (error) {
    await prisma.notificationDispatch.deleteMany({ where: { key: dispatchKey } }).catch(() => undefined);
    throw error;
  }
}

function compactNotificationBody(value: string) {
  const compacted = value.replace(/\s*\n\s*/g, " · ").trim();
  return compacted.length > 240 ? `${compacted.slice(0, 239)}…` : compacted;
}

function taskDispatchKey(input: { event: SharedTaskEvent; actorId: string; taskId: string; body: string }) {
  const hash = createHash("sha256").update(input.body).digest("base64url").slice(0, 18);
  return `task-event:${input.event}:${input.taskId}:${input.actorId}:${hash}`;
}

async function claimTaskDispatch(key: string, input: { event: SharedTaskEvent; taskId: string; actorId: string }) {
  try {
    await prisma.notificationDispatch.create({
      data: {
        key,
        type: "task_event",
        payload: { event: input.event, taskId: input.taskId, actorId: input.actorId },
      },
    });
    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return false;
    throw error;
  }
}
