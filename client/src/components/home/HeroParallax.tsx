"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * As you scroll past the hero, the cake drifts up a little slower than the page and tilts
 * slightly (GSAP ScrollTrigger). Skipped for reduced motion.
 */
export function HeroParallax({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !ref.current) return;
    let ctx: { revert: () => void } | undefined;
    let cancelled = false;
    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
      if (cancelled || !ref.current) return;
      gsap.registerPlugin(ScrollTrigger);
      ctx = gsap.context(() => {
        gsap.to(ref.current, {
          yPercent: -14,
          rotate: 3,
          scale: 0.96,
          ease: "none",
          scrollTrigger: { trigger: ref.current, start: "top top+=80", end: "bottom top", scrub: 0.6 },
        });
      });
    })();
    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
