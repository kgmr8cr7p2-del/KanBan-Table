"use client";

import dynamic from "next/dynamic";
import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const Lanyard = dynamic(() => import("@/components/Lanyard/Lanyard"), { ssr: false });

export function CreateTaskPawButton({ onClick }: { onClick: () => void }) {
  const zoneRef = useRef<HTMLDivElement>(null);
  const [showLanyard, setShowLanyard] = useState(false);

  useEffect(() => {
    const zone = zoneRef.current;
    if (!zone || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let animationFrame = 0;
    let pointerX = -10_000;
    let pointerY = -10_000;
    let lanyardVisible = false;

    const stopTracking = () => {
      pointerX = -10_000;
      pointerY = -10_000;
      zone.dataset.tracking = "false";
      lanyardVisible = false;
      setShowLanyard(false);
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
      const isTracking = distanceToButton <= (lanyardVisible ? 220 : 50);
      const anchorX = rect.left + rect.width / 2;
      const anchorY = rect.top;
      const deltaX = pointerX - anchorX;
      const deltaY = pointerY - anchorY;

      zone.dataset.tracking = String(isTracking);
      if (!isTracking) return;
      if (!lanyardVisible) {
        lanyardVisible = true;
        setShowLanyard(true);
      }

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
      {showLanyard ? (
        <div className="create-task-lanyard" aria-hidden="true">
          <Lanyard position={[0, 0, 24]} gravity={[0, -40, 0]} onActivate={onClick} />
        </div>
      ) : null}
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
