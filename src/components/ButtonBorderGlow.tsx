"use client";

import { useEffect } from "react";

const GLOW_TARGETS = "button, a.button, label.button, summary.button";

export function ButtonBorderGlow() {
  useEffect(() => {
    function updateGlow(event: PointerEvent) {
      if (event.pointerType !== "mouse") return;
      const origin = event.target instanceof Element ? event.target : null;
      const target = origin?.closest<HTMLElement>(GLOW_TARGETS);
      if (!target || target.dataset.borderGlow === "off" || target.matches(":disabled, [aria-disabled='true']")) return;

      const rect = target.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const deltaX = x - centerX;
      const deltaY = y - centerY;
      let angle = deltaX === 0 && deltaY === 0 ? 0 : Math.atan2(deltaY, deltaX) * (180 / Math.PI) + 90;
      if (angle < 0) angle += 360;

      target.style.setProperty("--button-glow-x", `${Math.max(0, Math.min(100, x / rect.width * 100)).toFixed(2)}%`);
      target.style.setProperty("--button-glow-y", `${Math.max(0, Math.min(100, y / rect.height * 100)).toFixed(2)}%`);
      target.style.setProperty("--button-glow-angle", `${angle.toFixed(2)}deg`);
    }

    document.addEventListener("pointermove", updateGlow, { passive: true });
    return () => document.removeEventListener("pointermove", updateGlow);
  }, []);

  return null;
}
