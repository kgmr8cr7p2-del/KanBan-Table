import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

const rhythmRows = [
  { time: "09:20", title: "Проверить утренние задачи", meta: "Доска · 4 участника", state: "Готово", done: true },
  { time: "11:40", title: "Согласовать сроки команды", meta: "В работе · 3 исполнителя", state: "Сейчас", active: true },
  { time: "14:15", title: "Посмотреть недельный отчёт", meta: "Отчёты · руководитель", state: "Далее" },
];

export function AuthShell({ mode, nextPath }: { mode: "login" | "register"; nextPath?: string }) {
  const isLogin = mode === "login";

  return (
    <main className={`auth-page auth-page-${mode}`}>
      <section className="auth-shell" aria-label={isLogin ? "Вход в Такт" : "Регистрация в Такт"}>
        <aside className="auth-story">
          <div className="auth-brand">
            <BrandMark />
            <span className="auth-brand-copy"><strong>Такт</strong><small>рабочая система команды</small></span>
          </div>

          <div className="auth-story-copy">
            <span className="auth-eyebrow">Задачи · люди · результат</span>
            <h2>Работайте<br />в одном <em>ритме.</em></h2>
            <p>Вся командная работа в одном месте: от первой задачи и обсуждения до отчёта о результате.</p>
          </div>

          <div className="auth-rhythm" aria-hidden="true">
            <div className="auth-rhythm-head">
              <span>Ритм дня</span>
              <strong><i /> Команда в сети</strong>
            </div>
            <div className="auth-rhythm-list">
              {rhythmRows.map((row) => (
                <div className={`auth-rhythm-row ${row.active ? "is-active" : ""} ${row.done ? "is-done" : ""}`} key={row.time}>
                  <time>{row.time}</time>
                  <span className="auth-rhythm-node" />
                  <span className="auth-rhythm-task"><strong>{row.title}</strong><small>{row.meta}</small></span>
                  <span className="auth-rhythm-state">{row.state}</span>
                </div>
              ))}
            </div>
          </div>

          <footer className="auth-story-foot">
            <span><i /> Система работает</span>
            <span>Такт · 2026</span>
          </footer>
        </aside>

        <section className={`auth-card ${isLogin ? "auth-card-login" : "auth-card-register"}`}>
          <div className="auth-mobile-brand">
            <BrandMark />
            <span className="auth-brand-copy"><strong>Такт</strong><small>рабочая система команды</small></span>
          </div>

          <nav className="auth-mode-switch" aria-label="Вход или регистрация">
            <Link href="/login" aria-current={isLogin ? "page" : undefined}>Вход</Link>
            <Link href="/register" aria-current={!isLogin ? "page" : undefined}>Регистрация</Link>
          </nav>

          <header className="auth-card-head">
            <span className="auth-kicker">{isLogin ? "Рабочее пространство" : "Новый участник"}</span>
            <h1>{isLogin ? "Войдите в свой аккаунт" : "Создайте аккаунт"}</h1>
            <p>{isLogin ? "Продолжите работу с задачами, сообщениями и отчётами команды." : "Заполните данные и используйте приглашённую рабочую почту для доступа."}</p>
          </header>

          <AuthForm mode={mode} nextPath={nextPath} />
          <p className="auth-security-note"><span aria-hidden="true">↳</span> Доступ к рабочим данным есть только у участников команды.</p>
        </section>
      </section>
    </main>
  );
}

function BrandMark() {
  return <span className="auth-brand-mark" aria-hidden="true"><i /><i /><i /><i /></span>;
}
