import { AuthForm } from "@/components/AuthForm";

export default function RegisterPage() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Регистрация</h1>
        <p className="muted">Зарегистрироваться могут только заранее добавленные почты. Письмо подтверждения не отправляется.</p>
        <AuthForm mode="register" />
      </section>
    </main>
  );
}
