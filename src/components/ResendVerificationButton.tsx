"use client";

import { useState } from "react";

export function ResendVerificationButton() {
  const [state, setState] = useState<"idle" | "sent" | "error">("idle");

  async function resend() {
    const response = await fetch("/api/auth/resend-verification", { method: "POST" });
    setState(response.ok ? "sent" : "error");
  }

  return (
    <>
      <button className="button" type="button" onClick={resend}>
        Отправить письмо ещё раз
      </button>
      {state === "sent" ? <p className="chip">Письмо отправлено</p> : null}
      {state === "error" ? <p className="chip priority-HIGH">Не удалось отправить письмо</p> : null}
    </>
  );
}
