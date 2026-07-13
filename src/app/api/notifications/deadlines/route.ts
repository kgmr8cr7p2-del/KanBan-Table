import { requireVerifiedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyTelegram } from "@/lib/telegram";
import { ok } from "@/lib/http";

export async function POST() {
  await requireVerifiedUser();
  const now = new Date();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const soon = await prisma.task.findMany({
    where: { deadline: { gte: now, lte: tomorrow }, assignees: { some: {} }, column: { board: { ownerId: null } } },
    select: { title: true, deadline: true, assignees: { select: { userId: true } } },
  });
  const overdue = await prisma.task.findMany({
    where: { deadline: { lt: now }, assignees: { some: {} }, column: { board: { ownerId: null } } },
    select: { title: true, deadline: true, assignees: { select: { userId: true } } },
  });

  await Promise.all([
    ...soon.map((task) => notifyTelegram("deadline_soon", `Задача: ${task.title}\nСрок: ${task.deadline?.toLocaleString("ru-RU")}`, task.assignees.map((item) => item.userId))),
    ...overdue.map((task) => notifyTelegram("deadline_overdue", `Задача: ${task.title}\nСрок: ${task.deadline?.toLocaleString("ru-RU")}`, task.assignees.map((item) => item.userId))),
  ]);

  return ok({ soon: soon.length, overdue: overdue.length });
}
