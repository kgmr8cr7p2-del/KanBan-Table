import { prisma } from "@/lib/prisma";

export type NotificationType = "CHAT_MESSAGE" | "MENTION" | "SYSTEM";

export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  href?: string;
}) {
  return prisma.notification.create({ data: input });
}

export async function createNotifications(inputs: Array<Parameters<typeof createNotification>[0]>) {
  if (!inputs.length) return;
  await prisma.notification.createMany({ data: inputs });
}
