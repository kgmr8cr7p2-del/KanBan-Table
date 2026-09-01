"use client";

import { CircleCheck, MessageCircle, Paperclip, Search, SlidersHorizontal, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChatThread } from "@/components/DirectChat";
import type { ProfileUser } from "@/components/ProfileCard/ProfileCard";
import { presenceLabel, presenceTone } from "@/lib/presence";

type Conversation = {
  user: ProfileUser;
  unreadCount: number;
  latest: {
    id: string;
    text: string;
    senderId: string;
    recipientId: string;
    fileName?: string | null;
    readAt?: string | null;
    createdAt: string;
  } | null;
};

export function ChatHub({ viewerId }: { viewerId: string }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [directoryFilter, setDirectoryFilter] = useState<"all" | "unread">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/messages/conversations", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) setError(payload.error || "Не удалось загрузить чаты");
      else {
        const nextConversations: Conversation[] = Array.isArray(payload.conversations) ? payload.conversations : [];
        setConversations(nextConversations);
        setError("");
      }
    } catch {
      setError("Не удалось загрузить чаты. Проверьте соединение и повторите попытку.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 4_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const unreadTotal = useMemo(() => conversations.reduce((sum, conversation) => sum + conversation.unreadCount, 0), [conversations]);
  const onlineCount = useMemo(() => conversations.filter(({ user }) => presenceTone(user) !== "offline").length, [conversations]);

  const visibleConversations = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ru-RU");
    return conversations.filter(({ user, unreadCount }) => {
      const matchesFilter = directoryFilter === "all" || unreadCount > 0;
      const matchesQuery = !normalized || [user.name, user.email, user.jobTitle, user.handle].some((value) => value?.toLocaleLowerCase("ru-RU").includes(normalized));
      return matchesFilter && matchesQuery;
    });
  }, [conversations, directoryFilter, query]);

  const selected = conversations.find(({ user }) => user.id === selectedId) ?? null;

  function chooseConversation(id: string) {
    setSelectedId(id);
    setConversations((current) => current.map((item) => (item.user.id === id ? { ...item, unreadCount: 0 } : item)));
  }

  return (
    <section className={`chat-hub ${selected ? "has-selection" : ""}`} aria-label="Чаты команды">
      <aside className="chat-directory" aria-label="Список чатов">
        <div className="chat-directory-head">
          <div className="chat-directory-title-row">
            <div className="chat-directory-title-copy">
              <span className="chat-section-label">ВХОДЯЩИЕ</span>
              <h2>Диалоги</h2>
            </div>
            <span className="chat-directory-count"><Users size={14} aria-hidden="true" />{conversations.length}</span>
          </div>
          <label className="chat-search">
            <Search size={17} aria-hidden="true" />
            <span className="visually-hidden">Найти человека</span>
            <input type="search" placeholder="Найти по имени или почте" value={query} onChange={(event) => setQuery(event.currentTarget.value)} />
          </label>
          <div className="chat-directory-filters" role="group" aria-label="Фильтр диалогов">
            <button type="button" className={directoryFilter === "all" ? "is-active" : ""} aria-pressed={directoryFilter === "all"} onClick={() => setDirectoryFilter("all")}>
              Все <span>{conversations.length}</span>
            </button>
            <button type="button" className={directoryFilter === "unread" ? "is-active" : ""} aria-pressed={directoryFilter === "unread"} onClick={() => setDirectoryFilter("unread")}>
              Непрочитанные <span>{unreadTotal}</span>
            </button>
          </div>
        </div>

        <ul className="chat-directory-list" aria-busy={loading}>
          {loading ? <li className="chat-directory-empty">Загружаем коллег…</li> : null}
          {!loading && !visibleConversations.length ? (
            <li className="chat-directory-empty">
              <span><SlidersHorizontal size={18} aria-hidden="true" /></span>
              <strong>{directoryFilter === "unread" ? "Все сообщения прочитаны" : "Никого не нашли"}</strong>
              <small>{directoryFilter === "unread" ? "Здесь появятся новые сообщения команды." : "Попробуйте изменить запрос или очистить поиск."}</small>
            </li>
          ) : null}
          {visibleConversations.map((conversation) => {
            const status = presenceLabel(conversation.user);
            const initials = conversation.user.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase("ru-RU")).join("");
            return (
              <li key={conversation.user.id}>
                <button
                  className={`chat-directory-item ${selectedId === conversation.user.id ? "is-active" : ""}`}
                  type="button"
                  aria-pressed={selectedId === conversation.user.id}
                  onClick={() => chooseConversation(conversation.user.id)}
                >
                  <span className="direct-chat-avatar chat-directory-avatar" aria-hidden="true">
                    {conversation.user.avatarUrl ? <img src={conversation.user.avatarUrl} alt="" /> : initials || "?"}
                    <i className={`chat-avatar-presence ${presenceTone(conversation.user)}`} />
                  </span>
                  <span className="chat-directory-copy">
                    <span className="chat-directory-name"><strong>{conversation.user.name}</strong>{conversation.latest ? <time dateTime={conversation.latest.createdAt}>{formatListTime(conversation.latest.createdAt)}</time> : null}</span>
                    <span className={`chat-directory-status ${presenceTone(conversation.user)}`}><i aria-hidden="true" />{status}{conversation.user.jobTitle ? <small>{conversation.user.jobTitle}</small> : null}</span>
                    <span className="chat-directory-preview">
                      {conversation.latest?.fileName && !conversation.latest.text ? <><Paperclip size={13} /> {conversation.latest.fileName}</> : conversation.latest?.text || "Сообщений пока нет"}
                    </span>
                  </span>
                  {conversation.unreadCount ? <span className="chat-unread-count" aria-label={`Непрочитанных сообщений: ${conversation.unreadCount}`}>{conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="chat-directory-footer">
          <span className="chat-sync-state"><CircleCheck size={15} aria-hidden="true" /> Синхронизировано</span>
          <span>{onlineCount} в сети</span>
        </div>
        {error ? <p className="chat-directory-error" role="alert">{error}</p> : null}
      </aside>

      <div className="chat-workspace">
        {selected ? (
          <ChatThread
            embedded
            user={selected.user}
            viewerId={viewerId}
            onBack={() => setSelectedId(null)}
            onMessagesRead={refresh}
          />
        ) : (
          <div className="chat-welcome">
            <span className="chat-welcome-mark"><MessageCircle size={26} aria-hidden="true" /></span>
            <span className="chat-section-label">КОМАНДНЫЕ СООБЩЕНИЯ</span>
            <h2>Выберите диалог</h2>
            <p>Откройте переписку слева, чтобы продолжить работу с коллегой.</p>
            <div className="chat-welcome-points" aria-label="Возможности чата">
              <span><CircleCheck size={15} aria-hidden="true" /> Файлы до 15 МБ</span>
              <span><CircleCheck size={15} aria-hidden="true" /> Живой статус</span>
              <span><CircleCheck size={15} aria-hidden="true" /> Автосинхронизация</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
function formatListTime(value: string) {
  const date = new Date(value);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(date);
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit" }).format(date);
}
