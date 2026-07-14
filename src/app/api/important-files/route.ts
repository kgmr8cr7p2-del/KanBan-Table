import crypto from "node:crypto";
import path from "node:path";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { PermissionKey } from "@prisma/client";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, handleRouteError, ok } from "@/lib/http";
import { sanitizeUploadFileName, validateImportantFile } from "@/lib/file-security";

const fileSelect = {
  id: true,
  title: true,
  description: true,
  category: true,
  originalName: true,
  size: true,
  mimeType: true,
  createdAt: true,
  updatedAt: true,
  uploadedBy: { select: { id: true, name: true, email: true } },
} as const;

export async function GET(request: Request) {
  try {
    await requirePermission(PermissionKey.VIEW_FILES);
    const params = new URL(request.url).searchParams;
    const query = params.get("q")?.trim() ?? "";
    const category = params.get("category")?.trim() ?? "";
    const files = await prisma.importantFile.findMany({
      where: {
        category: category || undefined,
        OR: query
          ? [
              { title: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
              { originalName: { contains: query, mode: "insensitive" } },
              { category: { contains: query, mode: "insensitive" } },
            ]
          : undefined,
      },
      orderBy: { createdAt: "desc" },
      select: fileSelect,
      take: 300,
    });
    const categories = await prisma.importantFile.findMany({
      where: { category: { not: "" } },
      distinct: ["category"],
      orderBy: { category: "asc" },
      select: { category: true },
    });
    return ok({ files, categories: categories.map((item) => item.category) });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  let directory = "";
  try {
    const user = await requirePermission(PermissionKey.MANAGE_FILES);
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return fail("Файл не передан", 422);
    const validationError = validateImportantFile(file);
    if (validationError) return fail(validationError, 422);

    const originalName = sanitizeUploadFileName(file.name);
    const title = String(formData.get("title") ?? "").trim() || originalName;
    const description = String(formData.get("description") ?? "").trim().slice(0, 2000);
    const category = String(formData.get("category") ?? "").trim().slice(0, 80);
    if (title.length < 2 || title.length > 180) return fail("Название файла должно быть от 2 до 180 символов", 422);

    const id = crypto.randomUUID();
    directory = path.join(process.cwd(), "uploads", "important-files", id);
    const storedFileName = `${Date.now()}-${originalName}`;
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, storedFileName), Buffer.from(await file.arrayBuffer()));

    const item = await prisma.importantFile.create({
      data: {
        id,
        title,
        description,
        category,
        originalName: file.name,
        storedFileName,
        size: file.size,
        mimeType: file.type || "application/octet-stream",
        uploadedById: user.id,
      },
      select: fileSelect,
    });
    return ok({ file: item }, { status: 201 });
  } catch (error) {
    if (directory) await rm(directory, { recursive: true, force: true }).catch(() => undefined);
    return handleRouteError(error);
  }
}
