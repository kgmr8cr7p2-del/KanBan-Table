import Image from "next/image";
import type { ReactNode } from "react";

export function AuthStepShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="auth-page auth-page-step">
      <section className="auth-shell" aria-labelledby="auth-step-title">
        <header className="auth-brand">
          <Image className="auth-brand-mark" src="/taskora-icon.png" width={42} height={42} alt="" priority />
          <span className="auth-brand-name">Taskora</span>
        </header>
        <div className="auth-step-intro">
          <h1 id="auth-step-title">{title}</h1>
          <p>{description}</p>
        </div>
        {children}
        {footer ? <footer className="auth-switch">{footer}</footer> : null}
      </section>
    </main>
  );
}
