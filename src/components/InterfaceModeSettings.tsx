"use client";

import { Check, LayoutDashboard, Sparkles } from "lucide-react";
import { useState } from "react";
import { INTERFACE_MODE_COOKIE, normalizeInterfaceMode, type InterfaceMode } from "@/lib/interface-mode";

const options: Array<{
  mode: InterfaceMode;
  title: string;
  description: string;
  meta: string;
}> = [
  {
    mode: "classic",
    title: "Текущий интерфейс",
    description: "Привычная навигация и компактная рабочая доска.",
    meta: "Классический режим",
  },
  {
    mode: "new",
    title: "Новый интерфейс",
    description: "Чёрно-белая bento-панель с более ясной иерархией.",
    meta: "Monochrome workspace",
  },
];

export function InterfaceModeSettings({ initialMode }: { initialMode: InterfaceMode }) {
  const [mode, setMode] = useState<InterfaceMode>(normalizeInterfaceMode(initialMode));
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  async function selectMode(nextMode: InterfaceMode) {
    if (nextMode === mode || status === "saving") return;
    const previousMode = mode;
    setMode(nextMode);
    applyMode(nextMode);
    setStatus("saving");
    setMessage("");

    try {
      const response = await fetch("/api/interface-mode", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: nextMode }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Не удалось сохранить режим интерфейса.");
      setStatus("saved");
      setMessage("Режим сохранён для вашей учётной записи");
    } catch (error) {
      setMode(previousMode);
      applyMode(previousMode);
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Не удалось сохранить режим интерфейса.");
    }
  }

  return (
    <section className="interface-mode-settings" aria-labelledby="interface-mode-title">
      <div className="interface-mode-intro">
        <span className="interface-mode-kicker"><Sparkles size={15} aria-hidden="true" /> Настройка вида</span>
        <h2 id="interface-mode-title">Как будет выглядеть ваша рабочая область?</h2>
        <p className="muted">Выберите стиль для доски, навигации и рабочих карточек. Переключение применяется сразу и сохраняется в аккаунте.</p>
      </div>

      <div className="interface-mode-options" role="radiogroup" aria-label="Режим интерфейса">
        {options.map((option) => (
          <label className={`interface-mode-option ${mode === option.mode ? "is-active" : ""}`} key={option.mode}>
            <input
              type="radio"
              name="interface-mode"
              value={option.mode}
              checked={mode === option.mode}
              onChange={() => void selectMode(option.mode)}
            />
            <span className={`interface-mode-preview interface-mode-preview-${option.mode}`} aria-hidden="true">
              <span className="interface-mode-preview-sidebar"><i /><i /><i /><i /></span>
              <span className="interface-mode-preview-main">
                <span className="interface-mode-preview-toolbar"><i /><i /><i /></span>
                <span className="interface-mode-preview-grid"><i /><i /><i /><i /></span>
              </span>
            </span>
            <span className="interface-mode-option-copy">
              <span className="interface-mode-option-head"><strong>{option.title}</strong><span className="interface-mode-check" aria-hidden="true"><Check size={14} /></span></span>
              <small>{option.description}</small>
              <span className="interface-mode-meta"><LayoutDashboard size={13} aria-hidden="true" /> {option.meta}</span>
            </span>
          </label>
        ))}
      </div>

      <p className={`interface-mode-message ${status === "error" ? "is-error" : ""}`} role="status" aria-live="polite">
        {status === "saving" ? "Сохраняем выбор…" : message || "Можно изменить режим в любой момент."}
      </p>
    </section>
  );
}

function applyMode(mode: InterfaceMode) {
  document.documentElement.dataset.interfaceMode = mode;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${INTERFACE_MODE_COOKIE}=${mode}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
  window.dispatchEvent(new CustomEvent("interfacemodechange", { detail: mode }));
}
