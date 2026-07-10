import { AuthForm } from "@/components/AuthForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Вход в Team Kanban Board</h1>
        <p className="muted">Используйте разрешённую почту и пароль. Доступ к доске открыт только для приглашённых адресов.</p>
        <AuthForm mode="login" nextPath={next} />
      </section>
    </main>
  );
}
