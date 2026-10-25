"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError } from "./api";
import { useAuth } from "./stores";

/** Sends signed-out visitors to /login and brings them back afterwards. */
export function useRequireAuth() {
  const { user, status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (status === "signed-out") router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [status, router, pathname]);
  return { user, ready: status === "signed-in" };
}

export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** First message per field from a 422 response, plus a general message for everything else. */
export function errorsFrom(err: unknown): { fields: Record<string, string>; message?: string } {
  if (err instanceof ApiError) {
    if (err.details) {
      const fields = Object.fromEntries(Object.entries(err.details).map(([k, v]) => [k, v[0] ?? "Check this field"]));
      return { fields };
    }
    return { fields: {}, message: err.message };
  }
  return { fields: {}, message: "Couldn't reach caketown. Check your connection and try again." };
}

/** Only allow same-site redirects after login. */
export function safeNext(next: string | null | undefined, fallback = "/account") {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}
