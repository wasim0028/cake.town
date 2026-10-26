"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { User } from "@caketown/shared";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/stores";

/**
 * Asks the API who is signed in, once, on load. `/auth/session` never 401s for guests and renews
 * the session if only the long-lived refresh cookie is left.
 */
function AuthBootstrap() {
  const setUser = useAuth((s) => s.setUser);
  useEffect(() => {
    api
      .get<{ user: User | null }>("/auth/session")
      .then((r) => setUser(r.user))
      .catch(() => setUser(null));
  }, [setUser]);
  return null;
}

/** Marks the page once the visitor navigates in-app, which turns on the page-enter animation. */
function NavigationFlag() {
  const pathname = usePathname();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    document.documentElement.dataset.navigated = "";
  }, [pathname]);
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60_000, retry: (count, err) => !(err instanceof ApiError && err.status < 500) && count < 2, refetchOnWindowFocus: false },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <AuthBootstrap />
      <NavigationFlag />
      {children}
    </QueryClientProvider>
  );
}
