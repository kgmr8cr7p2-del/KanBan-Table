"use client";

import { AlertCircle, ArrowRight, CheckCircle2, Eye, EyeOff, KeyRound, LockKeyhole, RotateCw } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";

export function ResetPasswordForm({ email }: { email: string }) {
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [complete, setComplete] = useState(false);

  if (!email) {
    return (
      <div className="auth-empty-step">
        <p>Сначала укажите почту аккаунта.</p>
        <Link className="button" href="/forgot-password">Запросить код</Link>
      </div>
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setStatus("");
    try {
      const response = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, code, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Не удалось изменить пароль");
        return;
      }
      setComplete(true);
    } catch {
      setError("Не удалось связаться с сервером. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    setResending(true);
    setError("");
    setStatus("");
    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Не удалось отправить новый код");
        return;
      }
      setStatus("Если аккаунт существует, новый код отправлен на почту.");
    } catch {
      setError("Не удалось связаться с сервером. Попробуйте ещё раз.");
    } finally {
      setResending(false);
    }
  }

  if (complete) {
    return (
      <div className="auth-complete" role="status">
        <CheckCircle2 size={34} aria-hidden="true" />
        <h2>Пароль изменён</h2>
        <p>Все прежние сеансы завершены. Теперь войдите с новым паролем.</p>
        <Link className="button" href="/login">Перейти ко входу</Link>
      </div>
    );
  }

  const errorId = error ? "password-reset-error" : undefined;
  return (
    <form className="form auth-form auth-step-form" onSubmit={submit} aria-busy={loading}>
      <p className="auth-delivery-note">Код отправлен на <strong>{email}</strong></p>
      <div className="field auth-field">
        <label className="label" htmlFor="password-reset-code">Код из письма</label>
        <span className="auth-control">
          <KeyRound size={18} aria-hidden="true" />
          <input
            className="auth-code-input"
            id="password-reset-code"
            name="code"
            value={code}
            onChange={(event) => setCode(event.currentTarget.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            enterKeyHint="next"
            pattern="\d{6}"
            minLength={6}
            maxLength={6}
            aria-invalid={Boolean(error)}
            aria-describedby={errorId}
            placeholder="000000"
            autoFocus
            required
          />
        </span>
      </div>
      <div className="field auth-field">
        <label className="label" htmlFor="reset-new-password">Новый пароль</label>
        <span className="auth-control auth-password-control">
          <LockKeyhole size={18} aria-hidden="true" />
          <input
            id="reset-new-password"
            name="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.currentTarget.value)}
            autoComplete="new-password"
            enterKeyHint="done"
            minLength={8}
            aria-invalid={Boolean(error)}
            aria-describedby={["reset-password-hint", errorId].filter(Boolean).join(" ")}
            placeholder="Минимум 8 символов"
            required
          />
          <button
            className="auth-password-toggle"
            type="button"
            aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((current) => !current)}
          >
            {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        </span>
        <small className="auth-field-hint" id="reset-password-hint">Используйте не меньше 8 символов.</small>
      </div>
      {error ? <p className="auth-error" id="password-reset-error" role="alert"><AlertCircle size={17} aria-hidden="true" />{error}</p> : null}
      {status ? <p className="auth-success" role="status">{status}</p> : null}
      <button className="button auth-submit" disabled={loading || code.length !== 6 || password.length < 8}>
        <span>{loading ? "Сохраняем…" : "Установить новый пароль"}</span>
        {!loading ? <ArrowRight size={18} aria-hidden="true" /> : <span className="auth-spinner" aria-hidden="true" />}
      </button>
      <div className="auth-secondary-actions">
        <button className="auth-text-button" type="button" disabled={resending} onClick={() => void resend()}>
          <RotateCw size={15} aria-hidden="true" />{resending ? "Отправляем…" : "Отправить код ещё раз"}
        </button>
        <Link href="/forgot-password">Изменить почту</Link>
      </div>
    </form>
  );
}
