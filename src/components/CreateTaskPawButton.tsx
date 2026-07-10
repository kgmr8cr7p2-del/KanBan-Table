"use client";

import { Plus } from "lucide-react";
import { useEffect, useRef } from "react";

export function CreateTaskPawButton({ onClick }: { onClick: () => void }) {
  const zoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const zone = zoneRef.current;
    if (!zone || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let animationFrame = 0;
    let pointerX = -10_000;
    let pointerY = -10_000;

    const stopTracking = () => {
      pointerX = -10_000;
      pointerY = -10_000;
      zone.dataset.tracking = "false";
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      }
    };

    const render = () => {
      animationFrame = 0;
      const rect = zone.getBoundingClientRect();
      if (
        !document.hasFocus() ||
        document.visibilityState !== "visible" ||
        pointerX < 0 ||
        pointerY < 0 ||
        pointerX > window.innerWidth ||
        pointerY > window.innerHeight
      ) {
        stopTracking();
        return;
      }

      const horizontalGap = pointerX < rect.left ? rect.left - pointerX : pointerX > rect.right ? pointerX - rect.right : 0;
      const verticalGap = pointerY < rect.top ? rect.top - pointerY : pointerY > rect.bottom ? pointerY - rect.bottom : 0;
      const distanceToButton = Math.hypot(horizontalGap, verticalGap);
      const isTracking = distanceToButton <= 50;
      const anchorX = rect.left + rect.width / 2;
      const anchorY = rect.top;
      const deltaX = pointerX - anchorX;
      const deltaY = pointerY - anchorY;

      zone.dataset.tracking = String(isTracking);
      if (!isTracking) return;

      const angle = clamp(deltaX * 0.16, -20, 20);
      const shift = clamp(deltaX * 0.48, -52, 52);
      const reach = clamp(deltaY * 0.28, -10, 28);
      zone.style.setProperty("--paw-angle", `${angle.toFixed(2)}deg`);
      zone.style.setProperty("--paw-shift", `${shift.toFixed(2)}px`);
      zone.style.setProperty("--paw-reach", `${reach.toFixed(2)}px`);
    };

    const followPointer = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (!animationFrame) animationFrame = window.requestAnimationFrame(render);
    };

    window.addEventListener("pointermove", followPointer, { passive: true });
    window.addEventListener("blur", stopTracking);
    document.addEventListener("mouseleave", stopTracking);
    document.addEventListener("visibilitychange", stopTracking);
    return () => {
      window.removeEventListener("pointermove", followPointer);
      window.removeEventListener("blur", stopTracking);
      document.removeEventListener("mouseleave", stopTracking);
      document.removeEventListener("visibilitychange", stopTracking);
      stopTracking();
    };
  }, []);

  return (
    <div className="create-task-paw-zone" data-tracking="false" ref={zoneRef}>
      <span className="cat-paw" aria-hidden="true">
        <svg viewBox="0 0 84 152" focusable="false">
          <rect className="cat-paw-leg" x="24" y="-8" width="36" height="112" rx="18" />
          <path className="cat-paw-stripe" d="M25 28c9 6 25 6 34 0M24 48c10 7 26 7 36 0" />
          <ellipse className="cat-paw-foot" cx="42" cy="112" rx="30" ry="27" />
          <ellipse className="cat-paw-pad" cx="42" cy="117" rx="12" ry="10" />
          <circle className="cat-paw-pad" cx="21" cy="103" r="6" />
          <circle className="cat-paw-pad" cx="35" cy="96" r="6" />
          <circle className="cat-paw-pad" cx="50" cy="96" r="6" />
          <circle className="cat-paw-pad" cx="64" cy="103" r="6" />
        </svg>
      </span>
      <button className="button create-task-button" type="button" onClick={onClick}>
        <Plus size={17} />
        Создать
      </button>
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
