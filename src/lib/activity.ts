import { ActivityAction, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function logActivity(input: {
  action: ActivityAction;
  userId: string;
  taskId?: string;
  details?: Prisma.InputJsonValue;
}) {
  await prisma.activityLog.create({
    data: {
      action: input.action,
      userId: input.userId,
      taskId: input.taskId,
      details: input.details ?? undefined,
    },
  });
}
