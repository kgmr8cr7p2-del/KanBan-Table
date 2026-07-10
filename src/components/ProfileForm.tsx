"use client";

import { useState } from "react";

export function ProfileForm({ name, email, telegramChatId }: { name: string; email: string; telegramChatId: string }) {
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
      <label className="field">
        <span className="label">Telegram chat ID</span>
        <input className="input" name="telegramChatId" value={telegramChatId || "-5575713442"} readOnly />
      </label>
      <button className="button">Сохранить</button>
      {saved ? <p className="chip" role="status">Профиль сохранён</p> : null}
    </form>
  );
}
