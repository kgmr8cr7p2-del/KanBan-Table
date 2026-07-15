"use client";

import { Bell, CheckCheck, Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";
import { getNotificationSoundVolume, isNotificationSoundEnabled, playChatNotification, setNotificationSoundPreferences } from "@/lib/chat-notification";

type Notice = { id: string; type: string; title: string; body: string; href: string | null; readAt: string | null; createdAt: string };

export function NotificationCenter({ fullPage = false }: { fullPage?: boolean }) {
  const [items, setItems] = useState<Notice[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(fullPage);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [volume, setVolume] = useState(0.06);

  useEffect(() => {
    setSoundEnabled(isNotificationSoundEnabled());
    setVolume(getNotificationSoundVolume());
  }, []);

  useEffect(() => {
    let active = true;
    let previousUnread = 0;
    async function refresh() {
      const response = await fetch("/api/notifications?limit=40", { cache: "no-store" }).catch(() => null);
      if (!response?.ok) return;
      const payload = await response.json().catch(() => ({}));
      if (!active) return;
      const nextUnread = Number(payload.unreadCount) || 0;
      if (nextUnread > previousUnread && previousUnread !== 0) {
        const latest = payload.notifications?.find((item: Notice) => !item.readAt);
        void playChatNotification(latest?.type === "MENTION" ? "mention" : "chat");
      }
      previousUnread = nextUnread;
      setUnread(nextUnread);
      setItems(Array.isArray(payload.notifications) ? payload.notifications : []);
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}`, { method: "PATCH" }).catch(() => undefined);
    setItems((current) => current.map((item) => item.id === id ? { ...item, readAt: new Date().toISOString() } : item));
    setUnread((current) => Math.max(0, current - 1));
  }

  async function markAllRead() {
    await fetch("/api/notifications", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "read-all" }) }).catch(() => undefined);
    setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
    setUnread(0);
  }

  function toggleSound() {
    const next = !soundEnabled;
    setSoundEnabled(next);
    setNotificationSoundPreferences(next, volume);
  }

  function updateVolume(next: number) {
    setVolume(next);
    setNotificationSoundPreferences(soundEnabled, next);
  }

  const content = <div className={fullPage ? "notification-page-card" : "notification-popover"}>
    <div className="notification-popover-head">
      <div><strong>Центр уведомлений</strong><small>{unread ? `${unread} непрочитанных` : "Всё прочитано"}</small></div>
      {unread ? <button className="button ghost compact-button" type="button" onClick={() => void markAllRead()}><CheckCheck size={15} />Прочитать все</button> : null}
    </div>
    <div className="notification-sound-settings">
      <button className="button ghost compact-button" type="button" onClick={toggleSound} aria-pressed={soundEnabled}>{soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}Звуки</button>
      <label className="notification-volume"><span className="visually-hidden">Громкость уведомлений</span><input type="range" min="0" max="0.15" step="0.01" value={volume} onChange={(event) => updateVolume(Number(event.currentTarget.value))} /></label>
    </div>
    <div className="notification-list">
      {items.length ? items.map((item) => <a className={`notification-item ${item.readAt ? "" : "is-unread"}`} href={item.href || "#"} key={item.id} onClick={() => void markRead(item.id)}>
        <span className={`notification-dot notification-dot-${item.type.toLowerCase()}`} />
        <span><strong>{item.title}</strong><span>{item.body}</span><small>{new Date(item.createdAt).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })}</small></span>
      </a>) : <p className="muted notification-empty">Новых уведомлений пока нет.</p>}
    </div>
    {!fullPage ? <a className="notification-open-link" href="/notifications" onClick={() => setOpen(false)}>Открыть центр уведомлений</a> : null}
  </div>;

  if (fullPage) return <main className="content notification-page"><div className="page-heading"><div><span className="eyebrow">Обратная связь</span><h1>Уведомления</h1><p className="muted">Упоминания, новые сообщения и важные события в ваших чатах.</p></div></div>{content}</main>;
  return <div className="notification-center"><button className="nav-notification-button" type="button" aria-label="Открыть центр уведомлений" aria-expanded={open} onClick={() => setOpen((current) => !current)}><Bell size={18} />{unread ? <span className="nav-unread-badge">{unread > 99 ? "99+" : unread}</span> : null}</button>{open ? content : null}</div>;
}
