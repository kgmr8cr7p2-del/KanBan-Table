"use client";

import { AlertCircle, ArrowRight, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

export function ForgotPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Не удалось отправить код");
        return;
      }
      router.push(`/reset-password?email=${encodeURIComponent(email)}`);
    } catch {
      setError("Не удалось связаться с сервером. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="form auth-form auth-step-form" onSubmit={submit} aria-busy={loading}>
      <div className="field auth-field">
        <label className="label" htmlFor="recovery-email">Почта аккаунта</label>
        <span className="auth-control">
          <Mail size={18} aria-hidden="true" />
          <input
            id="recovery-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            enterKeyHint="done"
            value={email}
            onChange={(event) => setEmail(event.currentTarget.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "recovery-email-error" : undefined}
            placeholder="name@company.ru"
            required
            autoFocus
          />
        </span>
      </div>
      {error ? <p className="auth-error" id="recovery-email-error" role="alert"><AlertCircle size={17} aria-hidden="true" />{error}</p> : null}
      <button className="button auth-submit" disabled={loading}>
        <span>{loading ? "Отправляем…" : "Получить код"}</span>
        {!loading ? <ArrowRight size={18} aria-hidden="true" /> : <span className="auth-spinner" aria-hidden="true" />}
      </button>
    </form>
  );
}
