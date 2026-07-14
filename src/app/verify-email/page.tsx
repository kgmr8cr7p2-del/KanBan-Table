import Link from "next/link";
import { AuthStepShell } from "@/components/AuthStepShell";
import { EmailCodeForm } from "@/components/EmailCodeForm";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email = "" } = await searchParams;
  return (
    <AuthStepShell
      title="Подтвердите почту"
      description="Мы отправили шестизначный код. Введите его, чтобы завершить регистрацию."
      footer={<>Уже подтвердили почту? <Link href="/login">Войти</Link></>}
    >
      <EmailCodeForm email={email.trim().toLowerCase()} />
    </AuthStepShell>
  );
}
