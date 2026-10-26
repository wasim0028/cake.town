"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Hides the shop's navbar, footer and cart on /admin, which has its own layout. */
export function ShopChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;
  return <>{children}</>;
}
