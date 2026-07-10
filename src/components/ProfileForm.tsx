"use client";

import { useState } from "react";

const TELEGRAM_INVITE_URL = "https://t.me/+V1kH1F871nc5MTUy";

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [saved, setSaved] = useState(false);

  async function submit(formData: FormData) {
    setSaved(false);
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData)),
    });
    setSaved(true);
  }

  return (
    <form className="form" action={submit}>
      <label className="field">
        <span className="label">Имя</span>
        <input className="input" name="name" defaultValue={name} required />
      </label>
      <label className="field">
        <span className="label">Почта</span>
        <input className="input" value={email} readOnly />
      </label>
      <div className="field">
        <span className="label">Telegram</span>
        <a className="button secondary profile-chat-link" href={TELEGRAM_INVITE_URL} target="_blank" rel="noreferrer">
          Войти в рабочий чат
        </a>
      </div>
      <button className="button">Сохранить</button>
      {saved ? <p className="chip" role="status">Профиль сохранён</p> : null}
    </form>
  );
}
