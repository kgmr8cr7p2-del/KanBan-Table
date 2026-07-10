"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect, useId, useRef } from "react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  tone?: "default" | "danger";
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({ open, title, description, confirmLabel, tone = "default", onCancel, onConfirm }: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      className="confirm-dialog"
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      onClose={onCancel}
    >
      <section className="confirm-dialog-content">
        <div className={`confirm-dialog-icon ${tone === "danger" ? "danger" : ""}`} aria-hidden="true">
          <AlertTriangle size={22} />
        </div>
        <div className="confirm-dialog-copy">
          <h2 id={titleId}>{title}</h2>
          <p className="muted" id={descriptionId}>{description}</p>
        </div>
        <footer className="confirm-dialog-actions">
          <button className="button secondary" type="button" onClick={onCancel}>Отмена</button>
          <button className={`button ${tone === "danger" ? "danger" : ""}`} type="button" onClick={onConfirm}>{confirmLabel}</button>
        </footer>
      </section>
    </dialog>
  );
}
