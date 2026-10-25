"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";

/**
 * Fades its children up the first time they scroll into view. Children marked
 * `data-reveal-item` are staggered. Without JS, or with reduced motion, content is just shown.
 */
export function Reveal({ as: Tag = "div", children, className, ...rest }: { as?: ElementType; children: ReactNode; className?: string } & Record<string, unknown>) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const items = root.querySelectorAll<HTMLElement>("[data-reveal-item]");
    const targets = items.length ? Array.from(items) : [root];
    targets.forEach((el, i) => {
      el.setAttribute("data-reveal", "");
      el.style.setProperty("--reveal-i", String(i % 8));
    });
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-reveal", "in");
          io.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <Tag ref={ref} className={className} {...rest}>
      {children}
    </Tag>
  );
}
