import path from "node:path";
import { readFile } from "node:fs/promises";
import { PermissionKey } from "@prisma/client";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { attachmentResponseHeaders } from "@/lib/file-security";
import { fail, handleRouteError } from "@/lib/http";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  try {
    await requirePermission(PermissionKey.VIEW_FILES);
    const { id } = await params;
    const file = await prisma.importantFile.findUnique({
      where: { id },
      select: { id: true, originalName: true, storedFileName: true, mimeType: true },
    });
    if (!file) return fail("Файл не найден", 404);
    const body = await readFile(path.join(process.cwd(), "uploads", "important-files", file.id, file.storedFileName));
    return new Response(new Uint8Array(body), {
      headers: attachmentResponseHeaders(file.originalName, file.mimeType),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
