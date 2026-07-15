"use client";

import { Bell, Building2, Database, MessageCircle, ShieldCheck, UsersRound, Volume2, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

export type SettingsPanel = {
  id: string;
  title: string;
  description: string;
  icon: "bell" | "building" | "database" | "message" | "shield" | "users" | "volume";
  content: ReactNode;
  wide?: boolean;
};

const icons = { bell: Bell, building: Building2, database: Database, message: MessageCircle, shield: ShieldCheck, users: UsersRound, volume: Volume2 } as const;

export function SettingsHub({
  panels,
  ariaLabel = "Разделы настроек",
  dialogKicker = "Настройка Taskora",
  storageKey = "settings",
}: {
  panels: SettingsPanel[];
  ariaLabel?: string;
  dialogKicker?: string;
  storageKey?: string;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = panels.find((panel) => panel.id === activeId) ?? null;
  const panelIds = panels.map((panel) => panel.id).join("|");
  const persistedKey = `taskora-open-panel:${storageKey}`;

  function openPanel(id: string) {
    window.sessionStorage.setItem(persistedKey, id);
    setActiveId(id);
  }

  function closePanel() {
    window.sessionStorage.removeItem(persistedKey);
    setActiveId(null);
  }

  useEffect(() => {
    const savedId = window.sessionStorage.getItem(persistedKey);
    if (savedId && panels.some((panel) => panel.id === savedId)) setActiveId(savedId);
  }, [panelIds, persistedKey]);

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        window.sessionStorage.removeItem(persistedKey);
        setActiveId(null);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [active, persistedKey]);

  return (
    <section className="settings-hub" aria-label={ariaLabel}>
      <div className="settings-choice-grid">
        {panels.map((panel) => {
          const Icon = icons[panel.icon];
          return <button className="settings-choice" type="button" key={panel.id} onClick={() => openPanel(panel.id)}>
            <span className="settings-choice-icon"><Icon size={20} /></span>
            <span className="settings-choice-copy"><strong>{panel.title}</strong><small>{panel.description}</small></span>
            <span className="settings-choice-arrow" aria-hidden="true">→</span>
          </button>;
        })}
      </div>

      {active ? <div className="settings-dialog-backdrop" role="presentation">
        <section className={`settings-dialog ${active.wide ? "settings-dialog-wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby={`settings-dialog-${active.id}`}>
          <header className="settings-dialog-head">
            <div><span className="settings-page-kicker">{dialogKicker}</span><h2 id={`settings-dialog-${active.id}`}>{active.title}</h2><p className="muted">{active.description}</p></div>
            <button className="button icon ghost" type="button" aria-label="Закрыть окно" onClick={closePanel}><X size={18} /></button>
          </header>
          <div className="settings-dialog-body">{active.content}</div>
        </section>
      </div> : null}
    </section>
  );
}
