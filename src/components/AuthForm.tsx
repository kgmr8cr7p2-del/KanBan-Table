"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AuthForm({ mode, nextPath }: { mode: "login" | "register"; nextPath?: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(formData: FormData) {
    setLoading(true);
    setError("");
    try {
      const payload = Object.fromEntries(formData);
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Не удалось выполнить действие");
        return;
      }
      const safeNext = nextPath?.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/board";
      router.push(data.verified === false ? "/verify-email" : safeNext);
      router.refresh();
    } catch {
      setError("Не удалось связаться с сервером. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="form" action={submit} aria-busy={loading}>
      {mode === "register" ? (
        <label className="field">
          <span className="label">Имя</span>
          <input className="input" name="name" autoComplete="name" required />
        </label>
      ) : null}
      <label className="field">
        <span className="label">Почта</span>
        <input className="input" name="email" type="email" autoComplete="email" required />
      </label>
      <label className="field">
        <span className="label">Пароль</span>
        <input className="input" name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required />
      </label>
      {error ? <p className="chip priority-HIGH" role="alert">{error}</p> : null}
      <button className="button" disabled={loading}>
        {loading ? "Подождите..." : mode === "login" ? "Войти" : "Зарегистрироваться"}
      </button>
      <p className="muted">
        {mode === "login" ? "Нет аккаунта? " : "Уже есть аккаунт? "}
        <Link href={mode === "login" ? "/register" : "/login"}>{mode === "login" ? "Зарегистрироваться" : "Войти"}</Link>
      </p>
    </form>
  );
}
