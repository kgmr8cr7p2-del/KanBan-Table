import { destroySession } from "@/lib/auth";
import { ok } from "@/lib/http";

export async function POST() {
  try {
    await destroySession();
  } catch (error) {
    console.error("Failed to fully destroy session", error);
  }
  const response = ok({ ok: true });
  response.headers.set("Clear-Site-Data", '"cache", "cookies", "storage"');
  return response;
}
