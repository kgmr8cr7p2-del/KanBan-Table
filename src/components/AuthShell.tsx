import Image from "next/image";
import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export function AuthShell({ mode, nextPath }: { mode: "login" | "register"; nextPath?: string }) {
  const isLogin = mode === "login";

  return (
    <main className={`auth-page auth-page-${mode}`}>
      <section className="auth-shell" aria-label={isLogin ? "Вход в Taskoral" : "Регистрация в Taskoral"}>
        <header className="auth-brand">
          <Image className="auth-brand-mark" src="/taskora-icon-v2.png" width={42} height={42} alt="" priority />
          <span className="auth-brand-name">Taskoral</span>
        </header>

        <div className="auth-intro">
          <div className="auth-card-head">
            <h1>{isLogin ? "Вход" : "Регистрация"}</h1>
            <p>{isLogin ? "С возвращением. Войдите в аккаунт, чтобы продолжить работу." : "Создайте аккаунт, чтобы начать работать с командой в Taskoral."}</p>
          </div>
          <div className="auth-pixel-art" aria-hidden="true"><span /></div>
        </div>

        <AuthForm mode={mode} nextPath={nextPath} />

        <footer className="auth-switch">
          {isLogin ? "Нет аккаунта?" : "Уже есть аккаунт?"}{" "}
          <Link href={isLogin ? "/register" : "/login"}>{isLogin ? "Зарегистрироваться" : "Войти"}</Link>
        </footer>
      </section>
    </main>
  );
}
