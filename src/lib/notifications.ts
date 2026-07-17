import { prisma } from "@/lib/prisma";
import { sendWebPushNotification } from "@/lib/web-push";

export type NotificationType = "CHAT_MESSAGE" | "MENTION" | "SYSTEM";
export type NotificationCategory = "chat" | "mention" | "task" | "deadline" | "system" | "general";

export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  category?: NotificationCategory;
  title: string;
  body: string;
  href?: string;
}) {
  const notification = await prisma.notification.create({ data: { ...input, category: input.category ?? defaultCategory(input.type) } });
  await sendWebPushNotification(notification.userId, notification).catch(() => undefined);
  return notification;
}

export async function createNotifications(inputs: Array<Parameters<typeof createNotification>[0]>) {
  if (!inputs.length) return;
  const notifications = await prisma.$transaction(inputs.map((input) => prisma.notification.create({ data: { ...input, category: input.category ?? defaultCategory(input.type) } })));
  await Promise.allSettled(notifications.map((notification) => sendWebPushNotification(notification.userId, notification)));
}

function defaultCategory(type: NotificationType): NotificationCategory {
  if (type === "CHAT_MESSAGE") return "chat";
  if (type === "MENTION") return "mention";
  return "system";
}
