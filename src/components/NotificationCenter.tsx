"use client";

import { Bell, CheckCheck, ListFilter, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";

type Notice = { id: string; type: string; category: string; title: string; body: string; href: string | null; readAt: string | null; createdAt: string };

const categoryFilters = [
  { value: "", label: "Все" },
  { value: "task", label: "Задачи" },
  { value: "deadline", label: "Дедлайны" },
  { value: "mention", label: "Упоминания" },
  { value: "chat", label: "Чаты" },
  { value: "system", label: "Системные" },
] as const;

const categoryLabels: Record<string, string> = {
  task: "Задача",
  deadline: "Дедлайн",
  mention: "Упоминание",
  chat: "Чат",
  system: "Система",
  general: "Общее",
};

export function NotificationCenter({ fullPage = false }: { fullPage?: boolean }) {
  const [items, setItems] = useState<Notice[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(fullPage);
  const [category, setCategory] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Notice | "all" | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    async function refresh() {
      const params = new URLSearchParams({ limit: fullPage ? "100" : "40" });
      if (category) params.set("category", category);
      if (unreadOnly) params.set("unread", "1");
      const response = await fetch(`/api/notifications?${params.toString()}`, { cache: "no-store" }).catch(() => null);
      if (!response?.ok) return;
      const payload = await response.json().catch(() => ({}));
      if (!active) return;
      const nextUnread = Number(payload.unreadCount) || 0;
      setUnread(nextUnread);
      setItems(Array.isArray(payload.notifications) ? payload.notifications : []);
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [category, fullPage, unreadOnly]);

  const taskHrefCounts = items.reduce<Record<string, number>>((acc, item) => {
    if (item.href?.startsWith("/board?task=")) acc[item.href] = (acc[item.href] ?? 0) + 1;
    return acc;
  }, {});

  async function markRead(id: string) {
    const item = items.find((candidate) => candidate.id === id);
    if (!item || item.readAt) return;
    const response = await fetch(`/api/notifications/${id}`, { method: "PATCH", keepalive: true }).catch(() => null);
    if (!response?.ok) return;
    setItems((current) => current.map((item) => item.id === id ? { ...item, readAt: new Date().toISOString() } : item));
    setUnread((current) => Math.max(0, current - 1));
  }

  async function markAllRead() {
    await fetch("/api/notifications", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "read-all" }) }).catch(() => undefined);
    setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
    setUnread(0);
  }

  async function markHrefRead(href: string) {
    const unreadForHref = items.filter((item) => item.href === href && !item.readAt).length;
    if (!unreadForHref) return;
    await fetch("/api/notifications", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "read-href", href }) }).catch(() => undefined);
    setItems((current) => current.map((item) => item.href === href ? { ...item, readAt: item.readAt ?? new Date().toISOString() } : item));
    setUnread((current) => Math.max(0, current - unreadForHref));
  }

  async function deleteNotifications() {
    const target = deleteTarget;
    if (!target) return;
    setError("");
    setDeleteTarget(null);
    const endpoint = target === "all" ? "/api/notifications" : `/api/notifications/${target.id}`;
    const response = await fetch(endpoint, { method: "DELETE" }).catch(() => null);
    const payload = await response?.json().catch(() => ({}));
    if (!response?.ok) {
      setError(payload?.error || "Не удалось удалить уведомления");
      return;
    }
    if (target === "all") {
      setItems([]);
      setUnread(0);
      return;
    }
    setItems((current) => current.filter((item) => item.id !== target.id));
    if (!target.readAt) setUnread((current) => Math.max(0, current - 1));
  }

  const content = <div className={fullPage ? "notification-page-card" : "notification-popover"}>
    <div className="notification-popover-head">
      <div><strong>Центр уведомлений</strong><small>{unread ? `${unread} непрочитанных` : "Всё прочитано"}</small></div>
      <div className="notification-popover-actions">
        {unread ? <button className="button ghost compact-button" type="button" onClick={() => void markAllRead()}><CheckCheck size={15} />Прочитать все</button> : null}
        {items.length ? <button className="button ghost compact-button danger-text" type="button" onClick={() => setDeleteTarget("all")}><Trash2 size={15} />Очистить все</button> : null}
      </div>
    </div>
    <div className="notification-filter-bar" aria-label="Фильтр уведомлений">
      <span><ListFilter size={14} /> Фильтр</span>
      {categoryFilters.map((item) => (
        <button className={category === item.value ? "is-active" : ""} type="button" key={item.value} onClick={() => setCategory(item.value)}>
          {item.label}
        </button>
      ))}
      <label>
        <input type="checkbox" checked={unreadOnly} onChange={(event) => setUnreadOnly(event.currentTarget.checked)} />
        Непрочитанные
      </label>
    </div>
    {error ? <p className="browser-push-message notification-error" role="status">{error}</p> : null}
    <div className="notification-list">
      {items.length ? items.map((item) => <article className={`notification-item ${item.readAt ? "" : "is-unread"}`} key={item.id}>
        {!item.readAt ? <span className={`notification-dot notification-dot-${item.type.toLowerCase()}`} aria-label="Непрочитанное уведомление" /> : null}
        <a className="notification-item-link" href={item.href || "#"} onClick={() => void markRead(item.id)}>
          <strong>{item.title}</strong><span>{item.body}</span><small><b>{categoryLabels[item.category] ?? item.category}</b> · {new Date(item.createdAt).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })}</small>
        </a>
        {item.href && taskHrefCounts[item.href] > 1 ? <button className="notification-task-read-button" type="button" onClick={() => void markHrefRead(item.href!)}>Прочитать по задаче</button> : null}
        <button className="notification-delete-button" type="button" aria-label={`Удалить уведомление «${item.title}»`} title="Удалить уведомление" onClick={() => setDeleteTarget(item)}><Trash2 size={15} /></button>
      </article>) : <p className="muted notification-empty">Уведомлений пока нет.</p>}
    </div>
    {!fullPage ? <a className="notification-open-link" href="/notifications" onClick={() => setOpen(false)}>Открыть центр уведомлений</a> : null}
    <ConfirmDialog
      open={Boolean(deleteTarget)}
      title={deleteTarget === "all" ? "Очистить все уведомления?" : "Удалить уведомление?"}
      description={deleteTarget === "all" ? "Все уведомления будут удалены без возможности восстановления." : "Это уведомление будет удалено без возможности восстановления."}
      confirmLabel={deleteTarget === "all" ? "Очистить все" : "Удалить"}
      tone="danger"
      onCancel={() => setDeleteTarget(null)}
      onConfirm={() => void deleteNotifications()}
    />
  </div>;

  if (fullPage) return <main className="content notification-page"><div className="page-heading"><div><span className="eyebrow">Обратная связь</span><h1>Уведомления</h1><p className="muted">Задачи, дедлайны, файлы, упоминания и сообщения в одном рабочем центре.</p></div></div>{content}</main>;
  return <div className="notification-center"><button className="nav-notification-button" type="button" aria-label="Открыть центр уведомлений" aria-expanded={open} onClick={() => setOpen((current) => !current)}><Bell size={18} />{unread ? <span className="nav-unread-badge">{unread > 99 ? "99+" : unread}</span> : null}</button>{open ? content : null}</div>;
}
