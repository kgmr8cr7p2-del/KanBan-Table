"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";

type OilDepotItem = { id: string; name: string; active: boolean; tasks?: unknown[] };

export function OilDepotSettings({ oilDepots, canManage }: { oilDepots: OilDepotItem[]; canManage: boolean }) {
  const [items, setItems] = useState(oilDepots);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<OilDepotItem | null>(null);

  async function add(formData: FormData) {
    setError("");
    const name = String(formData.get("name") ?? "");
    const response = await fetch("/api/oil-depots", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await response.json();
    if (!response.ok) return setError(data.error ?? "Не удалось создать нефтебазу");
    setItems((current) => [...current, { ...data.oilDepot, tasks: [] }]);
  }

  async function update(id: string, payload: Partial<Pick<OilDepotItem, "name" | "active">>) {
    setError("");
    const response = await fetch(`/api/oil-depots/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) return setError(data.error ?? "Не удалось сохранить нефтебазу");
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...data.oilDepot } : item)));
  }

  async function remove(id: string) {
    setError("");
    const response = await fetch(`/api/oil-depots/${id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) return setError(data.error ?? "Не удалось удалить нефтебазу");
    setItems((current) => current.filter((item) => item.id !== id));
  }

  if (!canManage) return null;

  return (
    <section className="settings-block">
      <div>
        <h2>Нефтебазы</h2>
        <p className="muted">Добавьте нефтебазы, чтобы выбирать их при создании задач и фильтровать доску.</p>
      </div>
      <form className="toolbar" action={add}>
        <input className="input" name="name" placeholder="Название нефтебазы" required />
        <button className="button">
          <Plus size={18} />
          Добавить
        </button>
      </form>
      {error ? <p className="chip priority-HIGH" role="alert">{error}</p> : null}
      <div className="list">
        {items.map((item) => (
          <div className="line-item oil-depot-row" key={item.id}>
            <input className="input" defaultValue={item.name} onBlur={(event) => update(item.id, { name: event.target.value })} />
            <label className="toggle-row">
              <input type="checkbox" checked={item.active} onChange={(event) => update(item.id, { active: event.target.checked })} />
              Активна
            </label>
            <button className="button icon danger" type="button" title="Удалить" aria-label={`Удалить нефтебазу ${item.name}`} onClick={() => setDeleteTarget(item)}>
              <Trash2 size={17} />
            </button>
          </div>
        ))}
      </div>
      <ConfirmDialog
        confirmLabel="Удалить нефтебазу"
        description={`Нефтебаза «${deleteTarget?.name ?? ""}» будет удалена, если к ней не привязаны задачи.`}
        open={Boolean(deleteTarget)}
        title="Удалить нефтебазу?"
        tone="danger"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          const target = deleteTarget;
          setDeleteTarget(null);
          if (target) void remove(target.id);
        }}
      />
    </section>
  );
}
