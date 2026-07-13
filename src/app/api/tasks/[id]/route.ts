import path from "node:path";
import { rm } from "node:fs/promises";
import { ActivityAction } from "@prisma/client";
import { requireVerifiedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { taskInclude, type TaskWithDetails } from "@/lib/board-data";
import { canDeleteTask, canEditTask } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";
import { notifyTelegram } from "@/lib/telegram";
import { fail, handleRouteError, ok } from "@/lib/http";
import { taskSchema } from "@/lib/validators";
import { tagConnects } from "@/lib/tags";
import { triggerTaskCompletionSoundEvent } from "@/lib/task-sound-event";
import { canAccessTask, getAccessibleColumn } from "@/lib/board-access";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await requireVerifiedUser();
    const { id } = await params;
    const access = await canAccessTask(user.id, id);
    if (!access) return fail("Задача не найдена", 404);
    const isPersonalBoard = access.column.board.ownerId === user.id;
    const existing = await prisma.task.findUnique({
      where: { id },
      include: { column: { select: { name: true } }, assignees: { select: { userId: true } } },
    });
    if (!existing) return fail("Задача не найдена", 404);
    if (!isPersonalBoard && !canEditTask(user, existing)) return fail("Недостаточно прав", 403);

    const input = taskSchema.partial().parse(await request.json());
    const hasAssigneeUpdate = input.assigneeIds !== undefined || input.assigneeId !== undefined;
    const assigneeIds = hasAssigneeUpdate
      ? Array.from(new Set(input.assigneeIds?.length ? input.assigneeIds : input.assigneeId ? [input.assigneeId] : []))
      : undefined;
    if (input.columnId) {
      const targetColumn = await getAccessibleColumn(user.id, input.columnId);
      if (!targetColumn || targetColumn.boardId !== access.column.boardId) return fail("Нельзя перенести задачу на другую доску", 400);
    }
    if (isPersonalBoard && assigneeIds?.some((userId) => userId !== user.id)) return fail("На личной доске задачу можно назначить только себе", 403);
    const changes: ActivityAction[] = [];
    if (input.title && input.title !== existing.title) changes.push(ActivityAction.TITLE_CHANGED);
    if (input.description !== undefined && input.description !== existing.description) changes.push(ActivityAction.DESCRIPTION_CHANGED);
    if (input.priority && input.priority !== existing.priority) changes.push(ActivityAction.PRIORITY_CHANGED);
    if (input.deadline !== undefined) changes.push(ActivityAction.DEADLINE_CHANGED);
    if (input.columnId && input.columnId !== existing.columnId) changes.push(ActivityAction.STATUS_CHANGED);
    if (input.oilDepotId !== undefined && (input.oilDepotId || null) !== existing.oilDepotId) changes.push(ActivityAction.DESCRIPTION_CHANGED);
    if (assigneeIds && !sameIds(assigneeIds, existing.assignees.map((item) => item.userId))) changes.push(ActivityAction.ASSIGNEE_CHANGED);

    if (input.tags) await prisma.taskTag.deleteMany({ where: { taskId: id } });

    const task = await prisma.task.update({
      where: { id },
      data: {
        title: input.title,
        description: input.description,
        priority: input.priority,
        deadline: input.deadline === undefined ? undefined : input.deadline ? new Date(input.deadline) : null,
        columnId: input.columnId,
        oilDepotId: input.oilDepotId === undefined ? undefined : input.oilDepotId || null,
        assigneeId: assigneeIds === undefined ? undefined : assigneeIds[0] || null,
        assignees: assigneeIds === undefined ? undefined : { deleteMany: {}, create: assigneeIds.map((userId) => ({ userId })) },
        tags: input.tags ? { create: await tagConnects(input.tags) } : undefined,
      },
      include: taskInclude,
    });

    await Promise.all(
      changes.map((action) =>
        logActivity({
          action,
          userId: user.id,
          taskId: task.id,
          details: action === ActivityAction.STATUS_CHANGED
            ? { title: task.title, column: task.column.name }
            : { title: task.title },
        }),
      ),
    );
    if (!isPersonalBoard && changes.includes(ActivityAction.STATUS_CHANGED)) {
      await notifyTelegram("status_changed", `${task.title}: ${task.column.name}`, task.assignees.map((item) => item.userId));
      if (!isCompletedColumn(existing.column.name) && isCompletedColumn(task.column.name)) {
        triggerTaskCompletionSoundEvent();
      }
    }
    if (!isPersonalBoard && changes.includes(ActivityAction.ASSIGNEE_CHANGED)) {
      await notifyTelegram("assignee_changed", formatAssigneeChangedMessage(task, user), task.assignees.map((item) => item.userId));
    }
    return ok({ task });
  } catch (error) {
    return handleRouteError(error);
  }
}

function formatAssigneeChangedMessage(task: TaskWithDetails, user: { name: string; email: string }) {
  const assignee = task.assignees.length
    ? task.assignees.map((item) => `${item.user.name} (${item.user.email})`).join(", ")
    : "не назначен";
  return [`Задача: ${task.title}`, `Назначили: ${assignee}`, `Изменил: ${user.name} (${user.email})`].join("\n");
}

function sameIds(left: string[], right: string[]) {
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return sortedLeft.length === sortedRight.length && sortedLeft.every((id, index) => id === sortedRight[index]);
}

function isCompletedColumn(name: string) {
  const normalized = name.toLocaleLowerCase("ru-RU");
  return normalized.includes("готов") || normalized.includes("done") || normalized.includes("complete");
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    const user = await requireVerifiedUser();
    const { id } = await params;
    const access = await canAccessTask(user.id, id);
    if (!access) return fail("Задача не найдена", 404);
    if (access.column.board.ownerId !== user.id && !canDeleteTask(user)) return fail("Удалять задачи общей доски может только администратор", 403);
    const task = await prisma.task.findUnique({
      where: { id },
      select: {
        id: true,
        taskNumber: true,
        title: true,
        oilDepotId: true,
        oilDepot: { select: { name: true } },
      },
    });
    if (!task) return fail("Задача не найдена", 404);

    await prisma.task.delete({ where: { id } });
    await rm(path.join(process.cwd(), "uploads", id), { recursive: true, force: true }).catch(() => undefined);
    if (!access.column.board.ownerId) {
      await logActivity({
        action: ActivityAction.TASK_DELETED,
        userId: user.id,
        details: {
          taskId: task.id,
          taskNumber: task.taskNumber,
          title: task.title,
          oilDepotId: task.oilDepotId,
          oilDepotName: task.oilDepot?.name ?? null,
          deletedPermanently: true,
        },
      });
    }
    return ok({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
