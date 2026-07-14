import Link from "next/link";
import { AuthStepShell } from "@/components/AuthStepShell";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email = "" } = await searchParams;
  return (
    <AuthStepShell
      title="Новый пароль"
      description="Введите код из письма и придумайте новый пароль для аккаунта."
      footer={<>Вернуться на страницу <Link href="/login">входа</Link></>}
    >
      <ResetPasswordForm email={email.trim().toLowerCase()} />
    </AuthStepShell>
  );
}
