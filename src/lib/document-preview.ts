import ExcelJS from "exceljs";
import { Readable } from "node:stream";

export function decodeDocumentText(body: Buffer) {
  if (body[0] === 0xff && body[1] === 0xfe)
    return new TextDecoder("utf-16le").decode(body);
  if (body[0] === 0xfe && body[1] === 0xff)
    return new TextDecoder("utf-16be").decode(body);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(body);
  } catch {
    return new TextDecoder("windows-1251").decode(body);
  }
}
export async function csvPreview(text: string) {
  const header = text.slice(0, 64000);
  const counts = new Map([
    [",", 0],
    [";", 0],
    ["\t", 0],
  ]);
  let quoted = false;
  for (let index = 0; index < header.length; index++) {
    if (!quoted && (header[index] === "\n" || header[index] === "\r")) break;
    if (header[index] === '"') {
      if (quoted && header[index + 1] === '"') index++;
      else quoted = !quoted;
    } else if (!quoted && counts.has(header[index]))
      counts.set(header[index], counts.get(header[index])! + 1);
  }
  const delimiter = [...counts].sort((a, b) => b[1] - a[1])[0][0];
  const workbook = new ExcelJS.Workbook();
  const sheet = await workbook.csv.read(Readable.from([text]), {
    parserOptions: { delimiter, maxRows: 201 },
    map: (value) => value,
  });
  const rows: string[][] = [];
  sheet.eachRow({ includeEmpty: true }, (row, index) => {
    if (index <= 200)
      rows.push(
        Array.from({ length: Math.min(sheet.columnCount, 40) }, (_, column) =>
          String(row.getCell(column + 1).value ?? ""),
        ),
      );
  });
  return { rows, truncated: sheet.rowCount > 200 || sheet.columnCount > 40 };
}
export function inlineDocumentMime(name: string, body: Buffer) {
  const extension = name.split(".").pop()?.toLowerCase();
  if (extension === "pdf" && body.subarray(0, 5).toString() === "%PDF-")
    return "application/pdf";
  if (
    extension === "png" &&
    body.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return "image/png";
  if (
    ["jpg", "jpeg"].includes(extension ?? "") &&
    body[0] === 255 &&
    body[1] === 216 &&
    body[2] === 255
  )
    return "image/jpeg";
  if (extension === "gif" && /^GIF8[79]a/.test(body.subarray(0, 6).toString()))
    return "image/gif";
  if (
    extension === "webp" &&
    body.subarray(0, 4).toString() === "RIFF" &&
    body.subarray(8, 12).toString() === "WEBP"
  )
    return "image/webp";
  return null;
}
