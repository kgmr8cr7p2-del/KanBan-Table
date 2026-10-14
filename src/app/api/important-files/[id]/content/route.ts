import path from "node:path";
import { readFile } from "node:fs/promises";
import { PermissionKey } from "@prisma/client";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { inlineDocumentMime } from "@/lib/document-preview";
import { fail, handleRouteError } from "@/lib/http";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission(PermissionKey.VIEW_FILES);
    const { id } = await params;
    const file = await prisma.importantFile.findUnique({
      where: { id },
      select: { id: true, originalName: true, storedFileName: true },
    });
    if (!file) return fail("Документ не найден", 404);
    const body = await readFile(
      path.join(
        process.cwd(),
        "uploads",
        "important-files",
        file.id,
        file.storedFileName,
      ),
    );
    const mime = inlineDocumentMime(file.originalName, body);
    if (!mime) return fail("Этот файл можно только скачать", 415);
    return new Response(new Uint8Array(body), {
      headers: {
        "content-type": mime,
        "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(file.originalName)}`,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
        "x-frame-options": "SAMEORIGIN",
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
