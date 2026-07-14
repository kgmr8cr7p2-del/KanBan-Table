import path from "node:path";

export const MAX_TASK_ATTACHMENT_BYTES = 25 * 1024 * 1024;
export const MAX_IMPORTANT_FILE_BYTES = 50 * 1024 * 1024;

const dangerousExtensions = new Set([
  ".app",
  ".bat",
  ".cmd",
  ".com",
  ".cpl",
  ".dll",
  ".exe",
  ".hta",
  ".html",
  ".htm",
  ".jar",
  ".js",
  ".jse",
  ".msi",
  ".msp",
  ".ps1",
  ".scr",
  ".sh",
  ".svg",
  ".vbe",
  ".vbs",
  ".wsf",
]);

const dangerousMimeTypes = new Set([
  "application/hta",
  "application/javascript",
  "application/x-msdownload",
  "application/x-ms-installer",
  "application/x-sh",
  "image/svg+xml",
  "text/html",
  "text/javascript",
]);

const blockedImportantFileExtensions = new Set([
  ".app",
  ".com",
  ".cpl",
  ".dll",
  ".exe",
  ".hta",
  ".jar",
  ".msi",
  ".msp",
  ".scr",
]);

export function sanitizeUploadFileName(name: string) {
  const baseName = path.basename(name || "attachment");
  const cleaned = baseName.replace(/[^\p{L}\p{N}._-]+/gu, "_").replace(/^_+|_+$/g, "");
  return cleaned || "attachment";
}

export function validateTaskAttachment(file: File, maxBytes = MAX_TASK_ATTACHMENT_BYTES) {
  if (file.size <= 0) return "Файл пустой";
  if (file.size > maxBytes) return `Файл не должен превышать ${Math.floor(maxBytes / 1024 / 1024)} МБ`;

  const extension = path.extname(file.name).toLowerCase();
  const mimeType = (file.type || "application/octet-stream").toLowerCase();
  if (dangerousExtensions.has(extension) || dangerousMimeTypes.has(mimeType)) {
    return "Этот тип файла нельзя прикреплять к задаче";
  }

  return null;
}

export function validateImportantFile(file: File) {
  if (file.size <= 0) return "Файл пустой";
  if (file.size > MAX_IMPORTANT_FILE_BYTES) return "Файл не должен превышать 50 МБ";

  const extension = path.extname(file.name).toLowerCase();
  if (blockedImportantFileExtensions.has(extension)) {
    return "Исполняемые файлы нельзя загружать в общее хранилище";
  }

  return null;
}

export function attachmentResponseHeaders(fileName: string, mimeType?: string | null) {
  const safeName = fileName.replace(/[\r\n"]/g, "_");
  return {
    "content-type": mimeType || "application/octet-stream",
    "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(safeName)}`,
    "cache-control": "private, no-store",
    "x-content-type-options": "nosniff",
  };
}
