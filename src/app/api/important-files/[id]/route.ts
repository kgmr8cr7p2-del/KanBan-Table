import path from "node:path";
import { rm } from "node:fs/promises";
import { PermissionKey } from "@prisma/client";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, handleRouteError, ok } from "@/lib/http";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_: Request, { params }: Params) {
  try {
    await requirePermission(PermissionKey.MANAGE_FILES);
    const { id } = await params;
    const file = await prisma.importantFile.findUnique({ where: { id }, select: { id: true, storedFileName: true } });
    if (!file) return fail("Файл не найден", 404);
    await prisma.importantFile.delete({ where: { id } });
    await rm(path.join(process.cwd(), "uploads", "important-files", file.id), { recursive: true, force: true }).catch(() => undefined);
    return ok({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
