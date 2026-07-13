"use client";

import { Plus } from "lucide-react";

export function CreateTaskButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="button create-task-button" type="button" onClick={onClick}>
      <Plus size={18} aria-hidden="true" />
      Создать задачу
    </button>
  );
}
