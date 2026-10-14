import { z } from "zod";
import { requireVerifiedUser } from "@/lib/auth";
import { canAccessTask } from "@/lib/board-access";
import { canEditTask } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { fail, handleRouteError, ok } from "@/lib/http";

const commandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("preference"), mode: z.enum(["board", "map"]) }),
  z.object({ action: z.literal("parent"), taskId: z.string().min(1), parentId: z.string().min(1).nullable() }),
  z.object({ action: z.literal("connect"), predecessorId: z.string().min(1), successorId: z.string().min(1) }),
  z.object({ action: z.literal("disconnect"), predecessorId: z.string().min(1), successorId: z.string().min(1) }),
]);

export async function POST(request: Request) {
  try {
    const user = await requireVerifiedUser();
    const command = commandSchema.parse(await request.json());
    if (command.action === "preference") {
      await prisma.user.update({ where: { id: user.id }, data: { taskMapPreference: command.mode } });
      return ok({ mode: command.mode });
    }

    if (command.action === "parent") {
      const child = await canAccessTask(user, command.taskId);
      if (!child) return fail("Задача не найдена", 404);
      if (!canEditTask(user, child) && child.column.board.ownerId !== user.id) return fail("Недостаточно прав", 403);
      if (command.parentId === command.taskId) return fail("Задача не может содержать саму себя", 422);
      if (command.parentId) {
        const parent = await canAccessTask(user, command.parentId);
        if (!parent || parent.column.boardId !== child.column.boardId) return fail("Родительская задача недоступна", 404);
        if (parent.parentId) return fail("Подзадача не может содержать другие задачи", 422);
        const childCount = await prisma.task.count({ where: { parentId: child.id } });
        if (childCount) return fail("Задача с подзадачами не может стать подзадачей", 422);
      }
      await prisma.task.update({ where: { id: child.id }, data: { parentId: command.parentId } });
      return ok({ taskId: child.id, parentId: command.parentId });
    }

    if (command.predecessorId === command.successorId) return fail("Задача не может зависеть от себя", 422);
    const [predecessor, successor] = await Promise.all([
      canAccessTask(user, command.predecessorId),
      canAccessTask(user, command.successorId),
    ]);
    if (!predecessor || !successor || predecessor.column.boardId !== successor.column.boardId) return fail("Связанные задачи недоступны", 404);
    if (!canEditTask(user, successor) && successor.column.board.ownerId !== user.id) return fail("Изменять зависимости этой задачи нельзя", 403);

    if (command.action === "disconnect") {
      await prisma.taskDependency.deleteMany({ where: { predecessorId: command.predecessorId, successorId: command.successorId } });
      return ok({ connected: false });
    }

    const links = await prisma.taskDependency.findMany({
      where: { predecessor: { column: { boardId: predecessor.column.boardId } } },
      select: { predecessorId: true, successorId: true },
    });
    const edges = new Map<string, string[]>();
    for (const link of links) edges.set(link.predecessorId, [...(edges.get(link.predecessorId) ?? []), link.successorId]);
    const pending = [command.successorId];
    const visited = new Set<string>();
    while (pending.length) {
      const next = pending.pop()!;
      if (next === command.predecessorId) return fail("Эта связь создаст замкнутую цепочку", 422);
      if (visited.has(next)) continue;
      visited.add(next);
      pending.push(...(edges.get(next) ?? []));
    }
    await prisma.taskDependency.upsert({
      where: { predecessorId_successorId: { predecessorId: command.predecessorId, successorId: command.successorId } },
      create: { predecessorId: command.predecessorId, successorId: command.successorId, createdById: user.id },
      update: {},
    });
    return ok({ connected: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
