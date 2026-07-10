"use client";

import { useState } from "react";
import { Volume2 } from "lucide-react";

export function GoidaTestButton() {
  const [busy, setBusy] = useState(false);

  async function triggerGoida() {
    setBusy(true);
    try {
      await fetch("/api/goida", { method: "POST" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <button className="button secondary goida-test-button" type="button" disabled={busy} onClick={() => void triggerGoida()}>
      <Volume2 size={17} />
      {busy ? "Запускаю..." : "Проверить гойду"}
    </button>
  );
}
