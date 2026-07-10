import Link from "next/link";

export default function NoAccessPage() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Нет доступа</h1>
        <p className="muted">Для этого раздела нужна другая роль или подтверждённая почта.</p>
        <div className="form">
          <Link className="button" href="/board">
            Вернуться на доску
          </Link>
        </div>
      </section>
    </main>
  );
}
