"use client";

import { Check, CircleAlert, X } from "lucide-react";
import { useToasts } from "@/lib/stores";
import styles from "./Toaster.module.css";

export function Toaster() {
  const { toasts, dismiss } = useToasts();
  return (
    <div className={styles.region} role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`${styles.toast} ${t.tone ? styles[t.tone] : ""}`}>
          {t.tone === "success" && <Check className={styles.icon} size={18} aria-hidden />}
          {t.tone === "error" && <CircleAlert className={styles.icon} size={18} aria-hidden />}
          <div className={styles.text}>
            <strong>{t.title}</strong>
            {t.body && <span>{t.body}</span>}
          </div>
          <button className={styles.dismiss} onClick={() => dismiss(t.id)} aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
