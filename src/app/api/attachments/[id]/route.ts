import path from "node:path";
import { rm } from "node:fs/promises";
import { requireVerifiedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canEditTask } from "@/lib/permissions";
import { fail, handleRouteError, ok } from "@/lib/http";
import { canAccessTask } from "@/lib/board-access";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_: Request, { params }: Params) {
  try {
    const user = await requireVerifiedUser();
    const { id } = await params;
    const attachment = await prisma.fileAttachment.findUnique({ where: { id }, include: { task: { include: { assignees: { select: { userId: true } } } } } });
    if (!attachment) return fail("Файл не найден", 404);
    const access = await canAccessTask(user, attachment.taskId);
    if (!access) return fail("Файл не найден", 404);
    if (access.column.board.ownerId !== user.id && !canEditTask(user, attachment.task)) return fail("Недостаточно прав", 403);
    await prisma.fileAttachment.delete({ where: { id } });
    const storedFileName = decodeURIComponent(attachment.url.split("/").pop() ?? "").replace(/[\\/]/g, "");
    if (storedFileName) {
      await rm(path.join(process.cwd(), "uploads", attachment.taskId, storedFileName), { force: true }).catch(() => undefined);
    }
    return ok({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
