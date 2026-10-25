"use client";

/**
 * Browser API client. Calls go to /api/v1 on the same origin (Next.js proxies them to Express),
 * so the httpOnly auth cookies just work. When the 15-minute access token expires the call is
 * retried once after a silent refresh.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Json = Record<string, unknown> | unknown[];

interface Options {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: Json;
  signal?: AbortSignal;
}

let refreshing: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  refreshing ??= fetch("/api/v1/auth/refresh", { method: "POST", credentials: "include" })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => {
      setTimeout(() => (refreshing = null), 0);
    });
  return refreshing;
}

async function request<T>(path: string, opts: Options, retried = false): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    method: opts.method ?? "GET",
    credentials: "include",
    headers: opts.body ? { "Content-Type": "application/json" } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  });

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => null);
  if (res.ok) return data as T;

  const err = data?.error ?? {};
  if (res.status === 401 && err.code === "TOKEN_EXPIRED" && !retried && (await refreshSession())) {
    return request<T>(path, opts, true);
  }
  throw new ApiError(
    res.status,
    err.code ?? "NETWORK",
    err.message ?? (res.status >= 500 ? "Something went wrong on our side. Please try again." : "Request failed"),
    err.details,
  );
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { signal }),
  post: <T>(path: string, body?: Json) => request<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: Json) => request<T>(path, { method: "PATCH", body }),
  put: <T>(path: string, body?: Json) => request<T>(path, { method: "PUT", body }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
