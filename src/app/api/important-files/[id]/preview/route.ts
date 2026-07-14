import path from "node:path";
import { readFile } from "node:fs/promises";
import ExcelJS from "exceljs";
import mammoth from "mammoth";
import { PermissionKey } from "@prisma/client";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, handleRouteError, ok } from "@/lib/http";

type Params = { params: Promise<{ id: string }> };

const textExtensions = new Set([
  ".bat", ".cmd", ".conf", ".config", ".csv", ".env", ".ini", ".js", ".json", ".log",
  ".md", ".ps1", ".py", ".sh", ".sql", ".ts", ".tsx", ".txt", ".xml", ".yaml", ".yml",
]);

const maxTextPreviewChars = 200_000;
const maxSheetRows = 200;
const maxSheetColumns = 40;

export async function GET(_: Request, { params }: Params) {
  try {
    await requirePermission(PermissionKey.VIEW_FILES);
    const { id } = await params;
    const file = await prisma.importantFile.findUnique({
      where: { id },
      select: { id: true, originalName: true, storedFileName: true, mimeType: true, size: true },
    });
    if (!file) return fail("Файл не найден", 404);

    const body = await readFile(path.join(process.cwd(), "uploads", "important-files", file.id, file.storedFileName));
    const extension = path.extname(file.originalName).toLowerCase();

    if (extension === ".docx") {
      const result = await mammoth.extractRawText({ buffer: body });
      return ok({
        preview: {
          type: "text",
          language: "text",
          truncated: result.value.length > maxTextPreviewChars,
          text: limitText(result.value),
        },
      });
    }

    if (extension === ".xlsx") {
      const workbook = new ExcelJS.Workbook();
      await (workbook.xlsx.load as (data: unknown) => Promise<unknown>)(body);
      const worksheet = workbook.worksheets[0];
      if (!worksheet) return ok({ preview: { type: "empty", message: "В книге нет листов" } });
      const rows: string[][] = [];
      const rowLimit = Math.min(worksheet.rowCount, maxSheetRows);
      const columnLimit = Math.min(worksheet.columnCount, maxSheetColumns);
      for (let rowIndex = 1; rowIndex <= rowLimit; rowIndex += 1) {
        const row = worksheet.getRow(rowIndex);
        const values: string[] = [];
        for (let columnIndex = 1; columnIndex <= columnLimit; columnIndex += 1) {
          values.push(formatCell(row.getCell(columnIndex).value));
        }
        rows.push(values);
      }
      return ok({
        preview: {
          type: "sheet",
          sheetName: worksheet.name,
          rows,
          truncated: worksheet.rowCount > maxSheetRows || worksheet.columnCount > maxSheetColumns,
          totalRows: worksheet.rowCount,
          totalColumns: worksheet.columnCount,
        },
      });
    }

    if (textExtensions.has(extension) || file.mimeType.startsWith("text/")) {
      const text = body.toString("utf8");
      return ok({
        preview: {
          type: extension === ".csv" ? "csv" : "code",
          language: languageFor(extension),
          truncated: text.length > maxTextPreviewChars,
          text: limitText(text),
          rows: extension === ".csv" ? parseCsvPreview(text) : undefined,
        },
      });
    }

    return ok({
      preview: {
        type: "unsupported",
        message: "Предпросмотр для этого формата недоступен. Файл можно безопасно скачать.",
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

function limitText(value: string) {
  return value.length > maxTextPreviewChars ? value.slice(0, maxTextPreviewChars) : value;
}

function formatCell(value: ExcelJS.CellValue) {
  if (value == null) return "";
  if (value instanceof Date) return value.toLocaleDateString("ru-RU");
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") return value.text;
    if ("result" in value) return String(value.result ?? "");
    if ("richText" in value && Array.isArray(value.richText)) return value.richText.map((item) => item.text).join("");
  }
  return String(value);
}

function parseCsvPreview(text: string) {
  return text
    .split(/\r?\n/)
    .slice(0, maxSheetRows)
    .map((line) => line.split(/;|,/).slice(0, maxSheetColumns));
}

function languageFor(extension: string) {
  if (extension === ".js") return "javascript";
  if (extension === ".ts" || extension === ".tsx") return "typescript";
  if (extension === ".ps1") return "powershell";
  if (extension === ".sh") return "bash";
  if (extension === ".py") return "python";
  if (extension === ".sql") return "sql";
  if (extension === ".json") return "json";
  if (extension === ".xml") return "xml";
  if (extension === ".md") return "markdown";
  if (extension === ".bat" || extension === ".cmd") return "batch";
  return "text";
}
