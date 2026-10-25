"use client";

import { useEffect, useRef } from "react";
import styles from "./Cursor.module.css";

const INTERACTIVE = "a, button, [role='button'], input, select, textarea, label, [data-cursor]";

/**
 * A small caramel dot that trails the mouse and swells over things you can click.
 * Desktop mouse only; the normal cursor stays visible, so nothing depends on it.
 */
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const el = dot.current;
    if (!fine || reduce || !el) return;

    let x = -100;
    let y = -100;
    let cx = x;
    let cy = y;
    let raf = 0;

    const loop = () => {
      cx += (x - cx) * 0.22;
      cy += (y - cy) * 0.22;
      el.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      raf = requestAnimationFrame(loop);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x = e.clientX;
      y = e.clientY;
      el.dataset.visible = "true";
      const target = e.target as Element | null;
      el.dataset.hover = target?.closest(INTERACTIVE) ? "true" : "false";
    };
    const leave = () => (el.dataset.visible = "false");
    const down = () => (el.dataset.down = "true");
    const up = () => (el.dataset.down = "false");

    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
    };
  }, []);

  return (
    <div ref={dot} className={styles.cursor} aria-hidden>
      <span />
    </div>
  );
}
