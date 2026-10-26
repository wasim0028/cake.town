"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { getLenis } from "@/components/layout/SmoothScroll";
import styles from "./Drawer.module.css";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  side?: "right" | "left";
  children: ReactNode;
  footer?: ReactNode;
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';

/**
 * Side panel (cart, mobile menu). Traps focus while open, closes on Esc or overlay click,
 * pauses smooth scrolling behind it and puts focus back where it was afterwards.
 * The slide is plain CSS (no animation library), so it costs nothing until it's opened.
 */
export function Drawer({ open, onClose, title, side = "right", children, footer }: DrawerProps) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  // Stay mounted for the closing slide, then unmount.
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (open) {
      setMounted(true);
      let inner = 0;
      const outer = requestAnimationFrame(() => (inner = requestAnimationFrame(() => setShown(true))));
      return () => (cancelAnimationFrame(outer), cancelAnimationFrame(inner));
    }
    setShown(false);
    const t = setTimeout(() => setMounted(false), 380);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const lenis = getLenis();
    lenis?.stop();
    document.documentElement.style.overflow = "hidden";
    const t = setTimeout(() => panel.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus(), 60);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab" || !panel.current) return;
      const items = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!items.length) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
      lenis?.start();
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  if (!mounted) return null;
  return createPortal(
    <div className={styles.root} data-side={side} data-state={shown ? "open" : "closed"}>
      <div className={styles.overlay} onClick={onClose} />
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} className={styles.panel} data-lenis-prevent>
        <header className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <button className={styles.close} onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </header>
        <div className={styles.body}>{children}</div>
        {footer && <footer className={styles.footer}>{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}
