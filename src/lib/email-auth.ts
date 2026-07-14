import { prisma } from "@/lib/prisma";
import {
  authCodeExpiresAt,
  authCodeRetryAfter,
  generateAuthCode,
  hashAuthCode,
} from "@/lib/auth-code";
import {
  assertMailConfigured,
  sendPasswordResetCodeEmail,
  sendVerificationCodeEmail,
} from "@/lib/mail";

export class AuthCodeCooldownError extends Error {
  retryAfter: number;

  constructor(retryAfter: number) {
    super(`Повторная отправка будет доступна через ${retryAfter} сек.`);
    this.name = "AuthCodeCooldownError";
    this.retryAfter = retryAfter;
  }
}

export async function issueVerificationCode(userId: string, email: string) {
  assertMailConfigured();
  const latest = await prisma.emailVerificationToken.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  const retryAfter = latest ? authCodeRetryAfter(latest.createdAt) : 0;
  if (retryAfter > 0 && latest && latest.expiresAt > new Date()) throw new AuthCodeCooldownError(retryAfter);

  const code = generateAuthCode();
  const token = await prisma.$transaction(async (tx) => {
    await tx.emailVerificationToken.deleteMany({ where: { userId } });
    return tx.emailVerificationToken.create({
      data: {
        userId,
        tokenHash: hashAuthCode(code, email, "verify-email"),
        expiresAt: authCodeExpiresAt(),
      },
    });
  });

  try {
    await sendVerificationCodeEmail(email, code);
  } catch (error) {
    await prisma.emailVerificationToken.delete({ where: { id: token.id } }).catch(() => undefined);
    throw error;
  }
}

export async function issuePasswordResetCode(userId: string, email: string) {
  assertMailConfigured();
  const latest = await prisma.passwordResetToken.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  const retryAfter = latest ? authCodeRetryAfter(latest.createdAt) : 0;
  if (retryAfter > 0 && latest && latest.expiresAt > new Date()) throw new AuthCodeCooldownError(retryAfter);

  const code = generateAuthCode();
  const token = await prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.deleteMany({ where: { userId } });
    return tx.passwordResetToken.create({
      data: {
        userId,
        tokenHash: hashAuthCode(code, email, "password-reset"),
        expiresAt: authCodeExpiresAt(),
      },
    });
  });

  try {
    await sendPasswordResetCodeEmail(email, code);
  } catch (error) {
    await prisma.passwordResetToken.delete({ where: { id: token.id } }).catch(() => undefined);
    throw error;
  }
}
