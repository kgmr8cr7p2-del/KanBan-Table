import { PermissionKey } from "@prisma/client";
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
  await createNotifications(recipients.map((recipient) => ({
    userId: recipient.id,
    type: "SYSTEM",
    title: taskEventTitles[input.event],
    body: `${taskLabel}: ${compactNotificationBody(input.body)}`,
    href: `/board?task=${encodeURIComponent(input.taskId)}`,
  })));
}

function compactNotificationBody(value: string) {
  const compacted = value.replace(/\s*\n\s*/g, " · ").trim();
  return compacted.length > 240 ? `${compacted.slice(0, 239)}…` : compacted;
}
