"use client";

import { ArrowLeft, CheckCheck, FileText, Image as ImageIcon, MessageCircle, Paperclip, Send, X } from "lucide-react";
import { Fragment, type FormEvent, type KeyboardEvent as ReactKeyboardEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ProfileUser } from "@/components/ProfileCard/ProfileCard";
import { presenceLabel, presenceTone, setPresenceActivity } from "@/lib/presence";
import { playChatNotification } from "@/lib/chat-notification";

export type ChatMessage = {
  id: string;
  text: string;
  senderId: string;
  recipientId: string;
  fileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  readAt?: string | null;
  createdAt: string;
};

type ChatThreadProps = {
  user: ProfileUser;
  viewerId: string;
  onClose?: () => void;
  onBack?: () => void;
  onMessagesRead?: () => void;
  embedded?: boolean;
};

export function ChatThread({ user, viewerId, onClose, onBack, onMessagesRead, embedded = false }: ChatThreadProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [refreshError, setRefreshError] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const knownMessageIdsRef = useRef(new Set<string>());
  const messagesLoadedRef = useRef(false);

  useEffect(() => {
    setPresenceActivity(`Общается с ${user.name}`);
    return () => setPresenceActivity(null);
  }, [user.id, user.name]);

  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const response = await fetch(`/api/messages?userId=${encodeURIComponent(user.id)}`, { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (!active) return;
        if (!response.ok) setRefreshError(payload.error || "Не удалось загрузить сообщения");
        else {
          setRefreshError("");
          const nextMessages: ChatMessage[] = Array.isArray(payload.messages) ? payload.messages : [];
          if (messagesLoadedRef.current && nextMessages.some((message) => message.senderId === user.id && !knownMessageIdsRef.current.has(message.id))) {
            void playChatNotification();
          }
          knownMessageIdsRef.current = new Set(nextMessages.map((message) => message.id));
          messagesLoadedRef.current = true;
          setMessages(nextMessages);
          onMessagesRead?.();
        }
      } catch {
        if (active) setRefreshError("Не удалось загрузить сообщения. Проверьте соединение и повторите попытку.");
      } finally {
        if (active) setLoading(false);
      }
    }
    setLoading(true);
    setMessages([]);
    setRefreshError("");
    knownMessageIdsRef.current = new Set();
    messagesLoadedRef.current = false;
    void refresh();
    const timer = window.setInterval(() => void refresh(), 3_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [user.id, onMessagesRead]);

  useEffect(() => {
    if (!selectedFile || !isPreviewableImageMime(selectedFile.type)) {
      setSelectedPreviewUrl("");
      return;
    }
    const objectUrl = URL.createObjectURL(selectedFile);
    setSelectedPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    list.scrollTop = list.scrollHeight;
  }, [messages.length]);

  useEffect(() => {
    if (!onClose) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = new FormData(form);
    body.set("userId", user.id);
    if (!String(body.get("text") ?? "").trim() && !(body.get("file") instanceof File && (body.get("file") as File).size)) return;
    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/messages", { method: "POST", body });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.error || "Не удалось отправить сообщение");
        return;
      }
      if (!payload.message) {
        setError("Сервер не вернул отправленное сообщение");
        return;
      }
      setMessages((current) => [...current, payload.message]);
      form.reset();
      setSelectedFile(null);
    } catch {
      setError("Не удалось отправить сообщение. Проверьте соединение и повторите попытку.");
    } finally {
      setSending(false);
    }
  }

  function sendOnEnter(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing || sending) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  const status = presenceLabel(user);
  const initials = user.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase("ru-RU")).join("");

  return (
    <section className={`direct-chat-panel ${embedded ? "is-embedded" : ""}`}>
      <header className="direct-chat-head">
        {onBack ? <button className="button icon secondary chat-back-button" type="button" aria-label="Вернуться к списку чатов" onClick={onBack}><ArrowLeft size={18} /></button> : null}
        <span className="direct-chat-avatar" aria-hidden="true">
          {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : initials || "?"}
        </span>
        <div className="direct-chat-person">
          <h2 id={embedded ? "chat-thread-title" : "direct-chat-title"}>{user.name}</h2>
          <span className={`direct-chat-presence ${presenceTone(user)}`}><i aria-hidden="true" />{status}</span>
        </div>
        {onClose ? <button className="button icon secondary direct-chat-close" type="button" aria-label="Закрыть чат" onClick={onClose}><X size={18} /></button> : null}
      </header>

      <div className="direct-chat-messages" ref={listRef} aria-live="polite" aria-busy={loading}>
        {loading ? <p className="direct-chat-empty">Загружаем переписку…</p> : null}
        {!loading && !messages.length ? <div className="direct-chat-empty-state"><span><MessageCircle size={22} aria-hidden="true" /></span><p>Пока нет сообщений.</p></div> : null}
        {messages.map((message, index) => {
          const own = message.senderId === viewerId;
          const showDayDivider = index === 0 || !isSameDay(messages[index - 1]?.createdAt, message.createdAt);
          return (
            <Fragment key={message.id}>
              {showDayDivider ? <div className="direct-chat-day-divider"><span>{formatDayLabel(message.createdAt)}</span></div> : null}
              <article className={`direct-chat-message ${own ? "own" : ""}`}>
                {message.text ? <p>{message.text}</p> : null}
                {message.fileName ? (
                  isPreviewableImageMime(message.mimeType) ? (
                    <a className="direct-chat-media" href={`/api/message-files/${message.id}?inline=1`} target="_blank" rel="noreferrer">
                      <img src={`/api/message-files/${message.id}?inline=1`} alt={message.fileName} loading="lazy" />
                      <span><ImageIcon size={14} aria-hidden="true" />{message.fileName}</span>
                    </a>
                  ) : (
                    <a className="direct-chat-file" href={`/api/message-files/${message.id}`}>
                      <FileText size={17} aria-hidden="true" />
                      <span><strong>{message.fileName}</strong><small>{formatFileSize(message.fileSize)}</small></span>
                    </a>
                  )
                ) : null}
                <footer>
                  <time dateTime={message.createdAt}>{formatTime(message.createdAt)}</time>
                  {own ? <span className={message.readAt ? "read" : ""}><CheckCheck size={14} />{message.readAt ? "Прочитано" : "Доставлено"}</span> : null}
                </footer>
              </article>
            </Fragment>
          );
        })}
      </div>

      {selectedFile ? (
        <div className="direct-chat-selected-file">
          {selectedPreviewUrl ? <img src={selectedPreviewUrl} alt="Предпросмотр выбранного изображения" /> : <FileText size={22} aria-hidden="true" />}
          <span><strong>{selectedFile.name}</strong><small>{formatFileSize(selectedFile.size)}</small></span>
          <button className="button icon secondary" type="button" aria-label="Убрать вложение" onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}><X size={16} /></button>
        </div>
      ) : null}

      <form className="direct-chat-compose" onSubmit={sendMessage}>
        <label className="button secondary direct-chat-attach chat-compose-button" title="Прикрепить файл">
          <Paperclip size={18} aria-hidden="true" />
          <span className="direct-chat-action-text">Прикрепить</span>
          <span className="visually-hidden">Прикрепить файл до 15 МБ</span>
          <input ref={fileInputRef} type="file" name="file" onChange={(event) => setSelectedFile(event.currentTarget.files?.[0] ?? null)} />
        </label>
        <textarea className="textarea" name="text" aria-label="Сообщение" placeholder="Напишите сообщение…" maxLength={4000} rows={1} enterKeyHint="send" onKeyDown={sendOnEnter} />
        <button className="button chat-compose-button" disabled={sending} aria-busy={sending} aria-label="Отправить сообщение"><Send size={18} aria-hidden="true" /><span className="direct-chat-action-text">{sending ? "Отправляем…" : "Отправить"}</span></button>
      </form>
      {error || refreshError ? <p className="direct-chat-notice is-error" role="alert">{error || refreshError}</p> : null}
    </section>
  );
}

export function DirectChat({ user, viewerId, onClose }: { user: ProfileUser; viewerId: string; onClose: () => void }) {
  return createPortal(
    <aside className="direct-chat-backdrop" role="dialog" aria-modal="true" aria-labelledby="direct-chat-title" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <ChatThread user={user} viewerId={viewerId} onClose={onClose} />
    </aside>,
    document.body,
  );
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function isSameDay(first?: string, second?: string) {
  if (!first || !second) return false;
  const firstDate = new Date(first);
  const secondDate = new Date(second);
  return firstDate.toDateString() === secondDate.toDateString();
}

function formatDayLabel(value: string) {
  const date = new Date(value);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === now.toDateString()) return "Сегодня";
  if (date.toDateString() === yesterday.toDateString()) return "Вчера";
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

function formatFileSize(size?: number | null) {
  if (!size) return "Файл";
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} КБ`;
  return `${(size / 1024 / 1024).toFixed(1)} МБ`;
}

function isPreviewableImageMime(value?: string | null) {
  return value === "image/jpeg" || value === "image/png" || value === "image/webp" || value === "image/gif";
}
