"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@caketown/shared";
import styles from "./kit.module.css";

/** Small building blocks shared by the admin pages. */

export function PageTitle({ title, intro, actions }: { title: string; intro?: ReactNode; actions?: ReactNode }) {
  return (
    <header className={styles.title}>
      <div>
        <h1>{title}</h1>
        {intro && <p className="muted">{intro}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}

export function Panel({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={[styles.panel, className].filter(Boolean).join(" ")}>
      {(title || action) && (
        <div className={styles.panelHead}>
          {title && <h2>{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

const STATUS_TONE: Record<string, string> = {
  pending_payment: "warn",
  placed: "info",
  baking: "accent",
  out_for_delivery: "accent",
  delivered: "good",
  cancelled: "muted",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={styles.status} data-tone={STATUS_TONE[status] ?? "muted"}>
      <span className={styles.dot} aria-hidden />
      {ORDER_STATUS_LABELS[status as OrderStatus] ?? status}
    </span>
  );
}

export function Pill({ children, tone = "muted" }: { children: ReactNode; tone?: "good" | "warn" | "info" | "accent" | "muted" | "bad" }) {
  return (
    <span className={styles.status} data-tone={tone}>
      {children}
    </span>
  );
}

export function Table({ head, children, empty, loading }: { head: ReactNode[]; children: ReactNode; empty?: ReactNode; loading?: boolean }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={i} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 5 }, (_, i) => (
              <tr key={i} className={styles.loadingRow}>
                <td colSpan={head.length}>
                  <span />
                </td>
              </tr>
            ))
          ) : children && (Array.isArray(children) ? children.length : true) ? (
            children
          ) : (
            <tr>
              <td colSpan={head.length} className={styles.empty}>
                {empty ?? "Nothing here yet."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Pager({ page, totalPages, total, onPage }: { page: number; totalPages: number; total: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return <p className={styles.pager}>{total} total</p>;
  return (
    <div className={styles.pager}>
      <span>
        Page {page} of {totalPages} · {total} total
      </span>
      <button onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page">
        <ChevronLeft size={18} />
      </button>
      <button onClick={() => onPage(page + 1)} disabled={page >= totalPages} aria-label="Next page">
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className={styles.toolbar}>{children}</div>;
}

export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; count?: number }[]; label: string }) {
  return (
    <div className={styles.segmented} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
          {o.count !== undefined && <span>{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export const dateTime = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
export const dateOnly = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
export const todayIST = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
