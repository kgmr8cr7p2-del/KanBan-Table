import { prisma } from "@/lib/prisma";
import { sendWebPushNotification } from "@/lib/web-push";

export type NotificationType = "CHAT_MESSAGE" | "MENTION" | "SYSTEM";

export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  href?: string;
}) {
  const notification = await prisma.notification.create({ data: input });
  await sendWebPushNotification(notification.userId, notification).catch(() => undefined);
  return notification;
}

export async function createNotifications(inputs: Array<Parameters<typeof createNotification>[0]>) {
  if (!inputs.length) return;
  const notifications = await prisma.$transaction(inputs.map((input) => prisma.notification.create({ data: input })));
  await Promise.allSettled(notifications.map((notification) => sendWebPushNotification(notification.userId, notification)));
}
