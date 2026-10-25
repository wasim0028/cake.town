"use client";

import { Minus, Plus, Star } from "lucide-react";
import { forwardRef, useId, type ComponentPropsWithoutRef, type ReactNode } from "react";
import styles from "./form.module.css";

/* ---------- Field: label + control + hint/error, wired for screen readers ---------- */

export function Field({
  label,
  hint,
  error,
  children,
  optional,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  className?: string;
  children: (props: { id: string; "aria-invalid"?: boolean; "aria-describedby"?: string }) => ReactNode;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={[styles.field, className].filter(Boolean).join(" ")}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {optional && <span className={styles.optional}> (optional)</span>}
      </label>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })}
      {hint && !error && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, ComponentPropsWithoutRef<"input">>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={[styles.input, className].filter(Boolean).join(" ")} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, ComponentPropsWithoutRef<"textarea">>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={[styles.input, styles.textarea, className].filter(Boolean).join(" ")} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, ComponentPropsWithoutRef<"select">>(function Select({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={[styles.input, styles.select, className].filter(Boolean).join(" ")} {...props}>
      {children}
    </select>
  );
});

/* ---------- Option cards (single choice) ---------- */

export interface OptionCard<T extends string> {
  value: T;
  label: ReactNode;
  detail?: ReactNode;
  aside?: ReactNode;
  disabled?: boolean;
  visual?: ReactNode;
}

export function OptionCards<T extends string>({
  name,
  legend,
  options,
  value,
  onChange,
  columns = 3,
  hideLegend,
}: {
  name: string;
  legend: string;
  options: OptionCard<T>[];
  value: T | undefined;
  onChange: (v: T) => void;
  columns?: number;
  hideLegend?: boolean;
}) {
  return (
    <fieldset className={styles.fieldset}>
      <legend className={hideLegend ? "visually-hidden" : styles.legend}>{legend}</legend>
      <div className={styles.cards} style={{ "--cols": columns } as React.CSSProperties}>
        {options.map((o) => (
          <label key={o.value} className={styles.card} data-checked={value === o.value || undefined} data-disabled={o.disabled || undefined}>
            <input type="radio" name={name} value={o.value} checked={value === o.value} disabled={o.disabled} onChange={() => onChange(o.value)} className={styles.radio} />
            {o.visual && <span className={styles.cardVisual}>{o.visual}</span>}
            <span className={styles.cardText}>
              <span className={styles.cardLabel}>{o.label}</span>
              {o.detail && <span className={styles.cardDetail}>{o.detail}</span>}
            </span>
            {o.aside && <span className={styles.cardAside}>{o.aside}</span>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/* ---------- Chips (multiple choice) ---------- */

export function Chips<T extends string>({
  legend,
  options,
  value,
  onChange,
  max,
  hideLegend,
}: {
  legend: string;
  options: { value: T; label: ReactNode }[];
  value: T[];
  onChange: (v: T[]) => void;
  max?: number;
  hideLegend?: boolean;
}) {
  const toggle = (v: T) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <fieldset className={styles.fieldset}>
      <legend className={hideLegend ? "visually-hidden" : styles.legend}>{legend}</legend>
      <div className={styles.chips}>
        {options.map((o) => {
          const on = value.includes(o.value);
          const blocked = !on && max !== undefined && value.length >= max;
          return (
            <label key={o.value} className={styles.chip} data-checked={on || undefined} data-disabled={blocked || undefined}>
              <input type="checkbox" checked={on} disabled={blocked} onChange={() => toggle(o.value)} className="visually-hidden" />
              {o.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/* ---------- Switch ---------- */

export function Switch({ checked, onChange, label, detail }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; detail?: ReactNode }) {
  return (
    <label className={styles.switchRow}>
      <span>
        <span className={styles.cardLabel}>{label}</span>
        {detail && <span className={styles.cardDetail}>{detail}</span>}
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className={styles.switch} />
    </label>
  );
}

/* ---------- Quantity ---------- */

export function Quantity({ value, onChange, min = 1, max = 20, label = "Quantity" }: { value: number; onChange: (v: number) => void; min?: number; max?: number; label?: string }) {
  return (
    <div className={styles.qty} role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="Decrease quantity">
        <Minus size={16} />
      </button>
      <output aria-live="polite" className="tnum">
        {value}
      </output>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="Increase quantity">
        <Plus size={16} />
      </button>
    </div>
  );
}

/* ---------- Stars ---------- */

export function Stars({ value, size = 16, label }: { value: number; size?: number; label?: string }) {
  return (
    <span className={styles.stars} role="img" aria-label={label ?? `${value.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} className={i <= Math.round(value) ? styles.starOn : styles.starOff} aria-hidden />
      ))}
    </span>
  );
}

export function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>Your rating</legend>
      <div className={styles.starInput}>
        {[1, 2, 3, 4, 5].map((i) => (
          <label key={i} data-on={i <= value || undefined}>
            <input type="radio" name="rating" value={i} checked={value === i} onChange={() => onChange(i)} className="visually-hidden" />
            <Star size={26} aria-hidden />
            <span className="visually-hidden">{i} star{i > 1 ? "s" : ""}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/* ---------- Accordion (native details) ---------- */

export function Accordion({ items }: { items: { q: ReactNode; a: ReactNode; id?: string }[] }) {
  return (
    <div className={styles.accordion}>
      {items.map((it, i) => (
        <details key={i} id={it.id} className={styles.item}>
          <summary>
            <span>{it.q}</span>
            <span className={styles.plus} aria-hidden />
          </summary>
          <div className={styles.answer}>{it.a}</div>
        </details>
      ))}
    </div>
  );
}

/* ---------- Form-level error ---------- */

export function FormError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <div className={styles.formError} role="alert">
      {children}
    </div>
  );
}
