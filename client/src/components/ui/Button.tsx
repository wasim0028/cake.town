"use client";

import Link from "next/link";
import { forwardRef, type ComponentPropsWithoutRef, type ReactNode, type PointerEvent } from "react";
import styles from "./Button.module.css";

type Variant = "primary" | "secondary" | "ghost" | "caramel";
type Size = "sm" | "md" | "lg";

interface Common {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  iconStart?: ReactNode;
  iconEnd?: ReactNode;
  block?: boolean;
}

type ButtonProps = Common & ComponentPropsWithoutRef<"button"> & { href?: undefined };
type LinkProps = Common & Omit<ComponentPropsWithoutRef<typeof Link>, "href"> & { href: string };

/** Ripple from where the pointer pressed: answers the click, then gets out of the way. */
function ripple(e: PointerEvent<HTMLElement>) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 2.2;
  const dot = document.createElement("span");
  dot.className = styles.ripple!;
  dot.style.width = dot.style.height = `${size}px`;
  dot.style.left = `${e.clientX - rect.left}px`;
  dot.style.top = `${e.clientY - rect.top}px`;
  el.appendChild(dot);
  dot.addEventListener("animationend", () => dot.remove());
}

function classes({ variant = "primary", size = "md", block, loading }: Common, extra?: string) {
  return [styles.btn, styles[variant], styles[size], block && styles.block, loading && styles.loading, extra].filter(Boolean).join(" ");
}

function Inner({ iconStart, iconEnd, loading, children }: Common & { children?: ReactNode }) {
  return (
    <>
      {loading && <span className={styles.spinner} aria-hidden />}
      {iconStart && <span className={styles.icon}>{iconStart}</span>}
      <span className={styles.label}>{children}</span>
      {iconEnd && <span className={styles.icon}>{iconEnd}</span>}
    </>
  );
}

export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps | LinkProps>(function Button(props, ref) {
  const { variant, size, loading, iconStart, iconEnd, block, className, children, ...rest } = props;
  const cls = classes({ variant, size, block, loading }, className);
  const inner = <Inner {...{ iconStart, iconEnd, loading }}>{children}</Inner>;

  if ("href" in rest && rest.href !== undefined) {
    const { onPointerDown, ...linkRest } = rest as LinkProps;
    return (
      <Link
        ref={ref as React.Ref<HTMLAnchorElement>}
        className={cls}
        onPointerDown={(e) => {
          ripple(e);
          onPointerDown?.(e);
        }}
        {...linkRest}
      >
        {inner}
      </Link>
    );
  }
  const { onPointerDown, disabled, type, ...btnRest } = rest as ButtonProps;
  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      type={type ?? "button"}
      className={cls}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onPointerDown={(e) => {
        ripple(e);
        onPointerDown?.(e);
      }}
      {...btnRest}
    >
      {inner}
    </button>
  );
});
