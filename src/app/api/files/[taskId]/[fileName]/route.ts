import path from "node:path";
import { readFile } from "node:fs/promises";
import { requireVerifiedUser } from "@/lib/auth";
import { fail } from "@/lib/http";

type Params = { params: Promise<{ taskId: string; fileName: string }> };

export async function GET(_: Request, { params }: Params) {
  await requireVerifiedUser();
  const { taskId, fileName } = await params;
  const safeName = decodeURIComponent(fileName).replace(/[\\/]/g, "");
  const filePath = path.join(process.cwd(), "uploads", taskId, safeName);
  try {
    const file = await readFile(filePath);
    return new Response(file);
  } catch {
    return fail("Файл не найден", 404);
  }
}
