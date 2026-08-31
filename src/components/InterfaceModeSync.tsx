"use client";

import { useEffect } from "react";
import { INTERFACE_MODE_COOKIE, normalizeInterfaceMode, type InterfaceMode } from "@/lib/interface-mode";

export function InterfaceModeSync({ mode }: { mode: InterfaceMode }) {
  useEffect(() => {
    const normalizedMode = normalizeInterfaceMode(mode);
    document.documentElement.dataset.interfaceMode = normalizedMode;
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${INTERFACE_MODE_COOKIE}=${normalizedMode}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
  }, [mode]);

  return null;
}
