import path from "node:path";
import { readFile } from "node:fs/promises";
import { requireVerifiedUser } from "@/lib/auth";
import { fail } from "@/lib/http";
import { canAccessTask } from "@/lib/board-access";
import { attachmentResponseHeaders } from "@/lib/file-security";
import { prisma } from "@/lib/prisma";
import { canViewTaskFiles } from "@/lib/permissions";

type Params = { params: Promise<{ taskId: string; fileName: string }> };

export async function GET(_: Request, { params }: Params) {
  const user = await requireVerifiedUser();
  const { taskId, fileName } = await params;
  const access = await canAccessTask(user, taskId);
  if (!access) return fail("Файл не найден", 404);
  const safeName = decodeURIComponent(fileName).replace(/[\\/]/g, "");
  const attachment = await prisma.fileAttachment.findFirst({
    where: {
      taskId,
      url: `/api/files/${taskId}/${encodeURIComponent(safeName)}`,
    },
    select: {
      fileName: true,
      mimeType: true,
      task: { select: { authorId: true, assigneeId: true, assignees: { select: { userId: true } } } },
    },
  });
  if (!attachment) return fail("Файл не найден", 404);
  if (access.column.board.ownerId !== user.id && !canViewTaskFiles(user, attachment.task)) {
    return fail("Файл не найден", 404);
  }
  const filePath = path.join(process.cwd(), "uploads", taskId, safeName);
  try {
    const file = await readFile(filePath);
    return new Response(new Uint8Array(file), {
      headers: attachmentResponseHeaders(attachment.fileName, attachment.mimeType),
    });
  } catch {
    return fail("Файл не найден", 404);
  }
}
