import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/crypto";
import { getCurrentUser } from "@/lib/auth";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; reason?: string }>;
}) {
  const params = await searchParams;
  let status: "verified" | "expired" | "waiting" = "waiting";

  if (params.token) {
    const record = await prisma.emailVerificationToken.findUnique({
      where: { tokenHash: hashToken(params.token) },
    });
    if (!record || record.expiresAt < new Date()) {
      status = "expired";
    } else {
      await prisma.user.update({
        where: { id: record.userId },
        data: { emailVerifiedAt: new Date() },
      });
      await prisma.emailVerificationToken.deleteMany({ where: { userId: record.userId } });
      status = "verified";
    }
  }

  const user = await getCurrentUser();

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>{status === "verified" ? "Почта подтверждена" : "Доступ ограничен"}</h1>
        {status === "verified" ? (
          <p className="muted">Готово, теперь можно открыть общую доску.</p>
        ) : status === "expired" ? (
          <p className="muted">Ссылка недействительна или устарела. Сейчас регистрация доступна только для заранее разрешённых адресов.</p>
        ) : (
          <p className="muted">Подтверждение по почте отключено. Новые пользователи из разрешённого списка получают доступ сразу после регистрации.</p>
        )}
        <div className="form">
          {status === "verified" ? (
            <Link className="button" href="/board">
              Открыть доску
            </Link>
          ) : user ? (
            <Link className="button" href="/login">
              Перейти ко входу
            </Link>
          ) : (
            <Link className="button" href="/login">
              Войти
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
