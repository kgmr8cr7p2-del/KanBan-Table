import { prisma } from "@/lib/prisma";
import { AUTH_CODE_MAX_ATTEMPTS, authCodeMatches } from "@/lib/auth-code";
import { hashPassword } from "@/lib/auth";
import { fail, handleRouteError, ok } from "@/lib/http";
import { sendPasswordChangedEmail } from "@/lib/mail";
import { notifyTelegram } from "@/lib/telegram";
import { passwordResetConfirmSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const input = passwordResetConfirmSchema.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user?.emailVerifiedAt) return fail("Код недействителен", 422);

    const token = await prisma.passwordResetToken.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    if (!token || token.expiresAt < new Date()) {
      await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
      return fail("Срок действия кода истёк. Запросите новый код.", 410);
    }
    if (token.attempts >= AUTH_CODE_MAX_ATTEMPTS) {
      await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
      return fail("Слишком много попыток. Запросите новый код.", 429);
    }
    if (!authCodeMatches(token.tokenHash, input.code, user.email, "password-reset")) {
      const attempts = token.attempts + 1;
      if (attempts >= AUTH_CODE_MAX_ATTEMPTS) {
        await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
        return fail("Слишком много попыток. Запросите новый код.", 429);
      }
      await prisma.passwordResetToken.update({ where: { id: token.id }, data: { attempts } });
      return fail(`Неверный код. Осталось попыток: ${AUTH_CODE_MAX_ATTEMPTS - attempts}.`, 422);
    }

    const passwordHash = await hashPassword(input.password);
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
      prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
      prisma.session.deleteMany({ where: { userId: user.id } }),
    ]);

    await Promise.all([
      sendPasswordChangedEmail(user.email).catch((error) => console.error("Password changed email failed", error)),
      notifyTelegram("password_reset", `Пользователь: ${user.name}\nПочта: ${user.email}`, [user.id]),
    ]);
    return ok({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
