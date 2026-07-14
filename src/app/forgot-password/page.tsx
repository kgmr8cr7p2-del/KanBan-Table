import Link from "next/link";
import { AuthStepShell } from "@/components/AuthStepShell";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <AuthStepShell
      title="Восстановление пароля"
      description="Укажите почту аккаунта — мы отправим код для установки нового пароля."
      footer={<>Вспомнили пароль? <Link href="/login">Вернуться ко входу</Link></>}
    >
      <ForgotPasswordForm />
    </AuthStepShell>
  );
}
