"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";

type ColumnItem = { id: string; name: string; position: number; tasks: unknown[] };

export function BoardSettings({ columns, canManage }: { columns: ColumnItem[]; canManage: boolean }) {
  const [items, setItems] = useState(columns);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ColumnItem | null>(null);

  async function add(formData: FormData) {
    const name = String(formData.get("name") ?? "");
    const response = await fetch("/api/columns", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await response.json();
    if (!response.ok) return setError(data.error ?? "Не удалось создать колонку");
    setItems((current) => [...current, { ...data.column, tasks: [] }]);
  }

  async function rename(id: string, name: string) {
    await fetch(`/api/columns/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
  }

  async function remove(id: string) {
    const response = await fetch(`/api/columns/${id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) return setError(data.error ?? "Не удалось удалить колонку");
    setItems((current) => current.filter((item) => item.id !== id));
  }

  async function reorder(nextItems: ColumnItem[]) {
    setItems(nextItems);
    const response = await fetch("/api/columns/reorder", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderedIds: nextItems.map((item) => item.id) }),
    });
    const data = await response.json();
    if (!response.ok) setError(data.error ?? "Не удалось сохранить порядок колонок");
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    void reorder(next.map((item, position) => ({ ...item, position })));
  }

  if (!canManage) return <div className="empty">Настройки колонок доступны только администратору.</div>;

  return (
    <div className="form">
      <form className="toolbar" action={add}>
        <input className="input" name="name" placeholder="Название новой колонки" required />
        <button className="button">
          <Plus size={18} />
          Добавить
        </button>
      </form>
      {error ? <p className="chip priority-HIGH" role="alert">{error}</p> : null}
      <div className="list">
        {items.map((column, index) => (
          <div className="line-item settings-column-row" key={column.id}>
            <div className="column-order-actions" aria-label="Порядок колонки">
              <button className="button icon secondary" type="button" title="Выше" aria-label={`Переместить колонку ${column.name} выше`} onClick={() => move(index, -1)} disabled={index === 0}>
                <ArrowUp size={16} />
              </button>
              <button className="button icon secondary" type="button" title="Ниже" aria-label={`Переместить колонку ${column.name} ниже`} onClick={() => move(index, 1)} disabled={index === items.length - 1}>
                <ArrowDown size={16} />
              </button>
            </div>
            <input className="input" defaultValue={column.name} onBlur={(event) => rename(column.id, event.target.value)} />
            <span className="count">{column.tasks.length}</span>
            <button className="button icon danger" type="button" title="Удалить" aria-label={`Удалить колонку ${column.name}`} onClick={() => setDeleteTarget(column)}>
              <Trash2 size={17} />
            </button>
          </div>
        ))}
      </div>
      <ConfirmDialog
        confirmLabel="Удалить колонку"
        description={`Колонка «${deleteTarget?.name ?? ""}» будет удалена. Это действие доступно только для пустых колонок.`}
        open={Boolean(deleteTarget)}
        title="Удалить колонку?"
        tone="danger"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          const target = deleteTarget;
          setDeleteTarget(null);
          if (target) void remove(target.id);
        }}
      />
    </div>
  );
}
