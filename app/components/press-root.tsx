"use client";

import { useEffect } from "react";

const PRESS_CLASS = "nc-press-on";
const PRESS_TARGET = "a, button, summary, [data-nc-press]";

function pressTarget(event: PointerEvent): HTMLElement | null {
  if (event.pointerType === "mouse" && event.button !== 0) return null;
  const node = event.target;
  if (!(node instanceof Element)) return null;
  const el = node.closest(PRESS_TARGET);
  if (!(el instanceof HTMLElement)) return null;
  if (el.closest("[disabled], [aria-disabled='true']")) return null;
  return el;
}

function clearPressed() {
  document.querySelectorAll(`.${PRESS_CLASS}`).forEach((node) => {
    node.classList.remove(PRESS_CLASS);
  });
}

export function PressRoot() {
  useEffect(() => {
    function onDown(event: PointerEvent) {
      const el = pressTarget(event);
      if (!el) return;
      el.classList.add(PRESS_CLASS);
    }
    function onUp() {
      clearPressed();
    }
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
    document.addEventListener("lostpointercapture", onUp);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
      document.removeEventListener("lostpointercapture", onUp);
      clearPressed();
    };
  }, []);
  return null;
}
