import { ActivityAction } from "@prisma/client";
import { requireVerifiedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { taskInclude } from "@/lib/board-data";
import { canEditTask } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";
import { notifyTelegram } from "@/lib/telegram";
import { fail, handleRouteError, ok } from "@/lib/http";
import { triggerTaskCompletionSoundEvent } from "@/lib/task-sound-event";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireVerifiedUser();
    const { id } = await params;
    const body = await request.json();
    const columnId = String(body.columnId ?? "");
    const position = Number(body.position ?? 0);
    const destinationColumn = await prisma.column.findUnique({ where: { id: columnId }, select: { name: true } });
    if (!destinationColumn) return fail("Колонка не найдена", 404);
    const existing = await prisma.task.findUnique({ where: { id }, include: { column: { select: { name: true } } } });
    if (!existing) return fail("Задача не найдена", 404);
    if (!canEditTask(user, existing)) return fail("Недостаточно прав", 403);

    const task = await prisma.task.update({
      where: { id },
      data: { columnId, position },
      include: taskInclude,
    });

    await logActivity({
      action: ActivityAction.STATUS_CHANGED,
      userId: user.id,
      taskId: task.id,
      details: { column: task.column.name },
    });
    await notifyTelegram("status_changed", `${task.title}: ${task.column.name}`, task.assigneeId ? [task.assigneeId] : []);
    if (!isCompletedColumn(existing.column.name) && isCompletedColumn(destinationColumn.name)) {
      triggerTaskCompletionSoundEvent();
    }
    return ok({ task });
  } catch (error) {
    return handleRouteError(error);
  }
}

function isCompletedColumn(name: string) {
  const normalized = name.toLocaleLowerCase("ru-RU");
  return normalized.includes("готов") || normalized.includes("done") || normalized.includes("complete");
}
