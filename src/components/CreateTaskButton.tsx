"use client";

import { Plus } from "lucide-react";

export function CreateTaskButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="button create-task-button" type="button" aria-label="Создать задачу" onClick={onClick}>
      <Plus size={18} aria-hidden="true" />
      <span className="create-task-full-label">Создать задачу</span><span className="create-task-short-label" aria-hidden="true">Задача</span>
    </button>
  );
}
