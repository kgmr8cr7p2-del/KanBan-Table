"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import {
  cacheSoundPreferences,
  getSoundPreferences,
} from "@/lib/chat-notification";
import { ProfileAvatar } from "@/components/ProfileCard/ProfileCard";
import styles from "./MonkeyMascot.module.css";
import { planMascotMotion } from "@/lib/mascot-motion";

type Person = { id: string; name: string; avatarUrl?: string | null };
type Notice = { id: string; title: string; body: string };
type Stage = "running" | "crouch" | "poop" | "throw";

export function MonkeyMascot({ userId }: { userId: string }) {
  const [visible, setVisible] = useState(true);
  const [stage, setStage] = useState<Stage>("running");
  const [left, setLeft] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [users, setUsers] = useState<Person[]>([]);
  const [query, setQuery] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [message, setMessage] = useState("");
  const runnerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<Animation | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const initialized = useRef(false);
  const motionStep = useRef(0);
  const seen = useRef(new Set<string>());

  useEffect(() => {
    const update = () => setVisible(getSoundPreferences().mascotEnabled);
    update();
    window.addEventListener("soundpreferenceschange", update);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(media.matches);
    const motion = () => setReduced(media.matches);
    media.addEventListener("change", motion);
    try {
      seen.current = new Set(
        JSON.parse(localStorage.getItem(`monkey-notices:${userId}`) || "[]"),
      );
    } catch {
      /* A notice can still be shown without storage. */
    }
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch("/api/monkey", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (!active) return;
        setUsers(data.users ?? []);
        const incoming = (data.notices ?? []).filter(
          (item: Notice) => !seen.current.has(item.id),
        );
        if (incoming.length) {
          setNotice(incoming[incoming.length - 1]);
          incoming.forEach((item: Notice) => seen.current.add(item.id));
          try {
            localStorage.setItem(
              `monkey-notices:${userId}`,
              JSON.stringify([...seen.current].slice(-100)),
            );
          } catch {
            /* Storage is optional. */
          }
        }
      } catch {
        /* Polling resumes after a temporary disconnection. */
      }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 5000);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("soundpreferenceschange", update);
      media.removeEventListener("change", motion);
    };
  }, [userId]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 8000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 4000);
    return () => clearTimeout(timer);
  }, [message]);
  useEffect(() => {
    if (stage !== "crouch") return;
    const timer = setTimeout(() => setStage("poop"), 700);
    return () => clearTimeout(timer);
  }, [stage]);

  useEffect(() => {
    const element = runnerRef.current;
    if (!element || !visible || stage !== "running") return;
    let active = true,
      timer: ReturnType<typeof setTimeout>;
    if (!initialized.current || !element.style.transform) {
      element.style.transform = `translate(${Math.max(12, innerWidth - 140)}px,${Math.max(12, innerHeight - 240)}px)`;
      initialized.current = true;
    }
    if (reduced) {
      const rect = element.getBoundingClientRect();
      element.style.transform = `translate(${Math.max(8, Math.min(innerWidth - 132, rect.left))}px,${Math.max(8, Math.min(innerHeight - 230, rect.top))}px)`;
      element.dataset.motion = "perched";
    }
    const freeze = () => {
      const rect = element.getBoundingClientRect();
      element.style.transform = `translate(${rect.left}px,${rect.top}px)`;
      animationRef.current?.cancel();
    };
    const move = () => {
      if (!active || reduced || document.hidden) return;
      if (document.querySelector("dialog[open], .task-drawer") ||
        document.activeElement?.matches("input,textarea,select,[contenteditable=true]")) {
        timer = setTimeout(move, 1000);
        return;
      }
      const rect = element.getBoundingClientRect();
      const platforms = [...document.querySelectorAll<HTMLElement>(".button, .task-card, .column-head, .nav a, summary, [data-mascot-platform]")]
        .filter(node => !element.contains(node) && !node.closest("dialog, .task-drawer") && node.getClientRects().length)
        .map(node => node.getBoundingClientRect())
        .filter(box => box.width >= 40 && box.height >= 20 && box.top >= 150 && box.top <= innerHeight - 100 && box.left >= 0 && box.right <= innerWidth)
        .map(box => ({ x: box.left, y: box.top, width: box.width }));
      const plan = planMascotMotion({ x: rect.left, y: rect.top }, { width: innerWidth, height: innerHeight }, platforms, ++motionStep.current);
      const { x, y } = plan.target;
      setLeft(x < rect.left);
      element.dataset.motion = plan.kind;
      element.inert = plan.kind === "exit" || plan.kind === "return";
      animationRef.current = element.animate(
        plan.keyframes,
        {
          duration: plan.duration,
          easing: "linear",
          fill: "forwards",
        },
      );
      animationRef.current.onfinish = () => {
        element.style.transform = `translate(${x}px,${y}px)`;
        animationRef.current?.cancel();
        element.dataset.motion = plan.kind === "exit" ? "offscreen" : "perched";
        element.inert = plan.kind === "exit";
        if (active) timer = setTimeout(move, plan.kind === "exit" ? 1200 : 650);
      };
    };
    const pause = () => {
      clearTimeout(timer);
      animationRef.current?.pause();
    };
    const resume = () => {
      clearTimeout(timer);
      if (animationRef.current?.playState === "paused")
        animationRef.current.play();
      else timer = setTimeout(move, 700);
    };
    const resize = () => {
      freeze();
      const rect = element.getBoundingClientRect();
      element.style.transform = `translate(${Math.max(8, Math.min(innerWidth - 132, rect.left))}px,${Math.max(8, Math.min(innerHeight - 230, rect.top))}px)`;
      clearTimeout(timer);
      timer = setTimeout(move, 500);
    };
    const visibility = () => {
      if (document.hidden) pause();
      else resume();
    };
    const scroll = () => {
      freeze();
      clearTimeout(timer);
      timer = setTimeout(move, 250);
    };
    element.addEventListener("pointerenter", pause);
    element.addEventListener("pointerleave", resume);
    element.addEventListener("focusin", pause);
    element.addEventListener("focusout", resume);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", visibility);
    document.addEventListener("scroll", scroll, true);
    timer = setTimeout(move, 1000);
    return () => {
      active = false;
      element.inert = false;
      clearTimeout(timer);
      freeze();
      element.removeEventListener("pointerenter", pause);
      element.removeEventListener("pointerleave", resume);
      element.removeEventListener("focusin", pause);
      element.removeEventListener("focusout", resume);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", visibility);
      document.removeEventListener("scroll", scroll, true);
    };
  }, [visible, stage, reduced]);

  async function hide() {
    setStage("running");
    const previous = getSoundPreferences();
    const next = { ...previous, mascotEnabled: false };
    cacheSoundPreferences(next);
    try {
      const response = await fetch("/api/notification-preferences", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ soundPreferences: next }),
      });
      if (!response.ok) throw Error();
    } catch {
      cacheSoundPreferences(previous);
      setMessage("Не удалось скрыть обезьяну. Попробуйте ещё раз.");
    }
  }
  async function throwAt(person: Person) {
    if (sending) return;
    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/monkey", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ recipientId: person.id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.sent)
        throw Error(data.error || "Не удалось отправить сюрприз");
      setStage("throw");
      dialogRef.current?.close();
      setMessage(`Сюрприз отправлен: ${person.name}`);
      setTimeout(() => setStage("running"), 900);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Не удалось отправить сюрприз",
      );
    } finally {
      setSending(false);
    }
  }
  const needle = query.trim().toLocaleLowerCase("ru-RU");
  return (
    <>
      {visible ? (
        <div
          ref={runnerRef}
          className={styles.runner}
          data-stage={stage}
          data-left={left}
          data-reduced={reduced}
        >
          <button
            className={styles.monkey}
            type="button"
            aria-label="Обезьяна: сделать сюрприз"
            title="Нажмите на обезьяну"
            onClick={() => {
              if (stage === "running") setStage("crouch");
            }}
          >
            <span className={styles.sprite} />
          </button>
          <button
            className={styles.hide}
            type="button"
            title="Скрыть обезьяну"
            aria-label="Скрыть обезьяну"
            onClick={() => void hide()}
          >
            <X size={14} />
          </button>
          {stage === "poop" || stage === "throw" ? (
            <button
              className={styles.poop}
              type="button"
              aria-label="Выбрать, в кого кинуть"
              title="Выбрать получателя"
              onClick={() => {
                setError("");
                setQuery("");
                dialogRef.current?.showModal();
              }}
            >
              <PoopPile />
            </button>
          ) : null}
        </div>
      ) : null}
      <dialog
        ref={dialogRef}
        className={styles.picker}
        aria-labelledby="monkey-picker-title"
        onCancel={(event) => {
          if (sending) event.preventDefault();
        }}
      >
        <header>
          <h2 id="monkey-picker-title">В кого кинуть?</h2>
          <button
            className="button icon secondary"
            type="button"
            aria-label="Закрыть выбор получателя"
            disabled={sending}
            onClick={() => dialogRef.current?.close()}
          >
            <X size={17} />
          </button>
        </header>
        <label className={styles.search}>
          <Search size={17} />
          <input
            aria-label="Найти получателя"
            placeholder="Имя коллеги"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className={styles.people}>
          {users
            .filter((person) =>
              person.name.toLocaleLowerCase("ru-RU").includes(needle),
            )
            .map((person) => (
              <button
                key={person.id}
                type="button"
                disabled={sending}
                onClick={() => void throwAt(person)}
              >
                <ProfileAvatar
                  name={person.name}
                  avatarUrl={person.avatarUrl}
                  size={36}
                />
                <span>{person.name}</span>
              </button>
            ))}
          {!users.length ? <p>Других участников пока нет.</p> : null}
        </div>
        {error ? (
          <p className="task-modal-error" role="alert">
            {error}
          </p>
        ) : null}
        {sending ? <p role="status">Летит…</p> : null}
      </dialog>
      {notice ? (
        <aside className={styles.notice} role="status">
          <span className={styles.splat}>
            <PoopPile />
          </span>
          <div>
            <strong>{notice.title}</strong>
            <p>{notice.body}</p>
          </div>
          <button
            type="button"
            className="button icon secondary"
            aria-label="Закрыть сюрприз"
            onClick={() => setNotice(null)}
          >
            <X size={17} />
          </button>
        </aside>
      ) : null}
      {message ? (
        <div className={styles.message} role="status">
          {message}
        </div>
      ) : null}
    </>
  );
}
function PoopPile() {
  return (
    <svg viewBox="0 0 80 80" aria-hidden="true">
      <path
        fill="#744329"
        stroke="#472b1e"
        strokeWidth="2"
        d="M15 70C1 68 4 50 18 48c-8-10 0-21 12-22-4-8 5-13 4-22 16 5 21 16 16 22 16 0 22 14 13 22 16 2 18 21 3 23Z"
      />
      <path
        fill="#a06b40"
        d="M20 53c15 4 28 4 42 0-10 9-30 9-42 0m8-21c10 4 17 3 25 0-5 8-19 8-25 0"
      />
      <ellipse cx="29" cy="48" rx="5" ry="7" fill="#fff" />
      <ellipse cx="50" cy="48" rx="5" ry="7" fill="#fff" />
      <circle cx="30" cy="50" r="2.5" fill="#211711" />
      <circle cx="49" cy="50" r="2.5" fill="#211711" />
      <path
        d="M32 62q8 6 15 0"
        fill="none"
        stroke="#211711"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
