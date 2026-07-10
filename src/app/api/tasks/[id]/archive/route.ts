import { ActivityAction } from "@prisma/client";
import { requireVerifiedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canDeleteTask } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";
import { fail, handleRouteError, ok } from "@/lib/http";

type Params = { params: Promise<{ id: string }> };

export async function POST(_: Request, { params }: Params) {
  try {
    const user = await requireVerifiedUser();
    if (!canDeleteTask(user)) return fail("Переносить задачи в архив может только администратор", 403);

    const { id } = await params;
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

    return ok({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
