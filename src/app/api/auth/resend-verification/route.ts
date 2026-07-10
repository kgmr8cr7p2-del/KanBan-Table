import { getCurrentUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return fail("Нужен вход", 401);
  if (user.emailVerifiedAt) return ok({ ok: true });

  return fail("Подтверждение по почте отключено. Регистрация доступна только для разрешённых адресов.", 410);
}
