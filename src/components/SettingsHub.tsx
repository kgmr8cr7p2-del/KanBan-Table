"use client";

import { Bell, Building2, Database, LayoutDashboard, MessageCircle, ShieldCheck, UsersRound, Volume2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

export type SettingsPanel = {
  id: string;
  title: string;
  description: string;
  icon: "bell" | "building" | "database" | "layout" | "message" | "shield" | "users" | "volume";
  content: ReactNode;
  wide?: boolean;
};

const icons = { bell: Bell, building: Building2, database: Database, layout: LayoutDashboard, message: MessageCircle, shield: ShieldCheck, users: UsersRound, volume: Volume2 } as const;

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
  const returnFocusRef = useRef<HTMLElement | null>(null);

  function openPanel(id: string) {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    try {
      window.sessionStorage.setItem(persistedKey, id);
    } catch {
      // Session storage is an enhancement; the dialog still works for this visit.
    }
    setActiveId(id);
  }

  const closePanel = useCallback(() => {
    try {
      window.sessionStorage.removeItem(persistedKey);
    } catch {
      // Ignore storage restrictions.
    }
    setActiveId(null);
    window.requestAnimationFrame(() => returnFocusRef.current?.focus());
  }, [persistedKey]);

  useEffect(() => {
    try {
      const savedId = window.sessionStorage.getItem(persistedKey);
      if (savedId && panelIds.split("|").includes(savedId)) setActiveId(savedId);
    } catch {
      // Ignore storage restrictions.
    }
  }, [panelIds, persistedKey]);

  useEffect(() => {
    if (!active) return;
    window.requestAnimationFrame(() => document.getElementById(`settings-dialog-${active.id}`)?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closePanel();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [active, closePanel]);

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

      {active ? <div className="settings-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closePanel(); }}>
        <section className={`settings-dialog ${active.wide ? "settings-dialog-wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby={`settings-dialog-${active.id}`} aria-describedby={`settings-dialog-description-${active.id}`}>
          <header className="settings-dialog-head">
            <div><span className="settings-page-kicker">{dialogKicker}</span><h2 id={`settings-dialog-${active.id}`} tabIndex={-1}>{active.title}</h2><p id={`settings-dialog-description-${active.id}`} className="muted">{active.description}</p></div>
            <button className="button icon ghost" type="button" aria-label="Закрыть окно" onClick={closePanel}><X size={18} /></button>
          </header>
          <div className="settings-dialog-body">{active.content}</div>
        </section>
      </div> : null}
    </section>
  );
}
