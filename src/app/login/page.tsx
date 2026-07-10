import { AuthForm } from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Вход в Team Kanban Board</h1>
        <p className="muted">Используйте разрешённую почту и пароль. Доступ к доске открыт только для приглашённых адресов.</p>
        <AuthForm mode="login" />
      </section>
    </main>
  );
}
