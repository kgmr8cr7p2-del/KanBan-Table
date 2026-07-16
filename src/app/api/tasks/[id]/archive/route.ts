import { ActivityAction } from "@prisma/client";
import { requireVerifiedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canDeleteTask } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";
import { fail, handleRouteError, ok } from "@/lib/http";
import { canAccessTask } from "@/lib/board-access";
import { triggerTaskCompletionSoundEvent } from "@/lib/task-sound-event";

type Params = { params: Promise<{ id: string }> };

export async function POST(_: Request, { params }: Params) {
  try {
    const user = await requireVerifiedUser();
    const { id } = await params;
    const access = await canAccessTask(user, id);
    if (!access) return fail("Задача не найдена", 404);
    if (access.column.board.ownerId !== user.id && !canDeleteTask(user)) return fail("Переносить задачи общей доски в архив может только администратор", 403);
    const task = await prisma.task.update({
      where: { id },
      data: {
        archivedAt: new Date(),
        archivedById: user.id,
      },
      select: {
        id: true,
        taskNumber: true,
        title: true,
        priority: true,
      },
    });

    await logActivity({
      action: ActivityAction.TASK_DELETED,
      userId: user.id,
      taskId: task.id,
      details: {
        taskId: task.id,
        taskNumber: task.taskNumber,
        title: task.title,
        archived: true,
      },
    });

    if (task.priority !== "PLANNED") {
      await triggerTaskCompletionSoundEvent(access.column.board.ownerId ? user.id : null).catch(() => undefined);
    }

    return ok({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
