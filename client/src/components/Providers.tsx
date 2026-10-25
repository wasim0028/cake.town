"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import type { User } from "@caketown/shared";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/stores";

/** Asks the API who is signed in (cookie-based) once, on load. */
function AuthBootstrap() {
  const setUser = useAuth((s) => s.setUser);
  useEffect(() => {
    api
      .get<{ user: User }>("/auth/me")
      .then((r) => setUser(r.user))
      .catch(() => setUser(null));
  }, [setUser]);
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
      {children}
    </QueryClientProvider>
  );
}
