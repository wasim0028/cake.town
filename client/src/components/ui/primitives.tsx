import { formatINR } from "@caketown/shared";
import type { ReactNode } from "react";
import styles from "./primitives.module.css";

/* ---------- Price ---------- */

export function Price({ value, compareAt, from, className }: { value: number; compareAt?: number; from?: boolean; className?: string }) {
  return (
    <span className={[styles.price, className].filter(Boolean).join(" ")}>
      {from && <span className={styles.from}>from </span>}
      <span className="tnum">{formatINR(value)}</span>
      {compareAt && compareAt > value && (
        <s className={styles.compare}>
          <span className="visually-hidden">was </span>
          {formatINR(compareAt)}
        </s>
      )}
    </span>
  );
}

/* ---------- Tag ---------- */

type TagTone = "fresh" | "neutral" | "accent";

export function Tag({ children, tone = "neutral", icon }: { children: ReactNode; tone?: TagTone; icon?: ReactNode }) {
  return (
    <span className={`${styles.tag} ${styles[tone]}`}>
      {icon}
      {children}
    </span>
  );
}

/* ---------- Skeleton ---------- */

export function Skeleton({ width, height, round, className }: { width?: string | number; height?: string | number; round?: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={[styles.skeleton, round && styles.round, className].filter(Boolean).join(" ")}
      style={{ width, height }}
    />
  );
}

/* ---------- Section heading ---------- */

export function SectionHeading({ title, intro, action, id }: { title: string; intro?: string; action?: ReactNode; id?: string }) {
  return (
    <div className={styles.heading}>
      <div>
        <h2 id={id}>{title}</h2>
        {intro && <p className={styles.intro}>{intro}</p>}
      </div>
      {action && <div className={styles.headingAction}>{action}</div>}
    </div>
  );
}
