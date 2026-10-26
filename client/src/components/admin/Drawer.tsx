"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import styles from "./Drawer.module.css";

/** Right-hand sheet for create/edit forms. Uses <dialog> so focus is trapped and Esc closes it. */
export function Drawer({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={styles.drawer}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
    >
      {open && (
        <div className={styles.inner}>
          <header className={styles.head}>
            <h2>{title}</h2>
            <button type="button" onClick={onClose} className={styles.close} aria-label="Close">
              <X size={20} />
            </button>
          </header>
          <div className={styles.body}>{children}</div>
        </div>
      )}
    </dialog>
  );
}
