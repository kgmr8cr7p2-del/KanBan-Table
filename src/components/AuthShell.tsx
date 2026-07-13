import { CheckCircle2, KanbanSquare } from "lucide-react";
import { AuthForm } from "@/components/AuthForm";

const benefits = ["Одна доска для всей команды", "Сроки и ответственные всегда видны", "История изменений сохраняется"];

export function AuthShell({ mode, nextPath }: { mode: "login" | "register"; nextPath?: string }) {
  const isLogin = mode === "login";

  return (
    <main className="auth-page">
      <section className="auth-shell" aria-label={isLogin ? "Вход в Team Kanban Board" : "Регистрация в Team Kanban Board"}>
        <aside className="auth-story">
          <div className="auth-brand">
            <span className="auth-brand-mark"><KanbanSquare size={22} aria-hidden="true" /></span>
            <span>Team Kanban Board</span>
          </div>

          <div className="auth-story-copy">
            <span className="auth-eyebrow">Рабочее пространство команды</span>
            <h2>От задачи<br />{" "}до результата.</h2>
            <p>Планируйте работу, распределяйте ответственность и не теряйте важное между сообщениями.</p>
          </div>

          <div className="auth-board-preview" aria-hidden="true">
            <div className="auth-preview-lane">
              <span>Новые</span>
              <i className="auth-preview-card card-short" />
              <i className="auth-preview-card" />
            </div>
            <div className="auth-preview-lane lane-active">
              <span>В работе</span>
              <i className="auth-preview-card card-accent" />
              <i className="auth-preview-card card-short" />
            </div>
            <div className="auth-preview-lane">
              <span>Готово</span>
              <i className="auth-preview-card card-done" />
            </div>
          </div>

          <ul className="auth-benefits">
            {benefits.map((benefit) => (
              <li key={benefit}><CheckCircle2 size={16} aria-hidden="true" />{benefit}</li>
            ))}
          </ul>
        </aside>

        <section className={`auth-card ${isLogin ? "auth-card-login" : "auth-card-register"}`}>
          <div className="auth-mobile-brand" aria-hidden="true">
            <span className="auth-brand-mark"><KanbanSquare size={19} /></span>
            <span>Team Kanban Board</span>
          </div>
          <header className="auth-card-head">
            <span className="auth-kicker">{isLogin ? "Вход в систему" : "Новый аккаунт"}</span>
            <h1>{isLogin ? "С возвращением" : "Присоединяйтесь к команде"}</h1>
            <p>{isLogin ? "Введите рабочую почту и пароль, чтобы открыть доску." : "Используйте приглашённую рабочую почту — доступ откроется сразу после регистрации."}</p>
          </header>
          <AuthForm mode={mode} nextPath={nextPath} />
        </section>
      </section>
    </main>
  );
}
