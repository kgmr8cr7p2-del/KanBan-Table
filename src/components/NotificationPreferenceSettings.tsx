"use client";

import { Bell, CalendarClock, CheckCircle2, MessageCircle, MessagesSquare, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";

type Preferences = {
  browserChat: boolean;
  browserMentions: boolean;
  browserTasks: boolean;
  browserDeadlines: boolean;
  browserSystem: boolean;
};

const defaultPreferences: Preferences = {
  browserChat: true,
  browserMentions: true,
  browserTasks: true,
  browserDeadlines: true,
  browserSystem: true,
};

const options = [
  { key: "browserChat", title: "Чаты", description: "Личные сообщения и вложения в чатах.", icon: MessagesSquare },
  { key: "browserMentions", title: "Упоминания", description: "Комментарии, где вас отметили через @.", icon: MessageCircle },
  { key: "browserTasks", title: "Задачи", description: "Создание, комментарии, смена статуса и исполнителей.", icon: CheckCircle2 },
  { key: "browserDeadlines", title: "Дедлайны", description: "Напоминания по срокам задач.", icon: CalendarClock },
  { key: "browserSystem", title: "Системные", description: "Тестовые и служебные уведомления Taskora.", icon: Bell },
] as const;

export function NotificationPreferenceSettings() {
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<keyof Preferences | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      const response = await fetch("/api/notification-preferences", { cache: "no-store" }).catch(() => null);
      const payload = await response?.json().catch(() => ({}));
      if (!active) return;
      if (response?.ok && payload.preferences) setPreferences({ ...defaultPreferences, ...payload.preferences });
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, []);

  async function toggle(key: keyof Preferences) {
    const nextValue = !preferences[key];
    const previous = preferences;
    setPreferences((current) => ({ ...current, [key]: nextValue }));
    setSavingKey(key);
    setMessage("");
    const response = await fetch("/api/notification-preferences", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ [key]: nextValue }),
    }).catch(() => null);
    const payload = await response?.json().catch(() => ({}));
    if (response?.ok && payload.preferences) {
      setPreferences({ ...defaultPreferences, ...payload.preferences });
      setMessage("Настройки сохранены.");
    } else {
      setPreferences(previous);
      setMessage(payload?.error || "Не удалось сохранить настройки.");
    }
    setSavingKey(null);
  }

  return (
    <section className="settings-block notification-preferences-card" aria-labelledby="notification-preferences-title">
      <div className="notification-preferences-head">
        <span className="settings-page-kicker"><SlidersHorizontal size={16} /> Категории push</span>
        <h2 id="notification-preferences-title">Какие push-уведомления показывать</h2>
        <p className="muted">Центр уведомлений продолжит хранить все события, здесь настраивается только системный push браузера.</p>
      </div>
      <div className="notification-preference-list" aria-busy={loading}>
        {options.map((option) => {
          const Icon = option.icon;
          const key = option.key;
          return (
            <label className="notification-preference-row" key={key}>
              <span className="notification-preference-icon"><Icon size={17} /></span>
              <span className="notification-preference-copy">
                <strong>{option.title}</strong>
                <small>{option.description}</small>
              </span>
              <input
                type="checkbox"
                checked={preferences[key]}
                disabled={loading || savingKey === key}
                onChange={() => void toggle(key)}
              />
            </label>
          );
        })}
      </div>
      {message ? <p className="browser-push-message" role="status">{message}</p> : null}
    </section>
  );
}
