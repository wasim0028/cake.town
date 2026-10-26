import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { AuthResponse } from "@caketown/shared";

/**
 * API client for the app. Sends `X-Client: mobile` so the API returns tokens in the body
 * (instead of web cookies). The refresh token lives in the device keychain (SecureStore); the
 * short-lived access token only in memory. Expired access tokens are refreshed once, silently.
 */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:5000").replace(/\/$/, "");
const REFRESH_KEY = "ct_refresh";

let accessToken: string | null = null;
let refreshing: Promise<boolean> | null = null;
let onSignedOut: (() => void) | null = null;

/* SecureStore isn't available on web previews; fall back to localStorage there. */
const store = {
  get: (k: string) => (Platform.OS === "web" ? Promise.resolve(globalThis.localStorage?.getItem(k) ?? null) : SecureStore.getItemAsync(k)),
  set: (k: string, v: string) => (Platform.OS === "web" ? Promise.resolve(globalThis.localStorage?.setItem(k, v)) : SecureStore.setItemAsync(k, v)),
  del: (k: string) => (Platform.OS === "web" ? Promise.resolve(globalThis.localStorage?.removeItem(k)) : SecureStore.deleteItemAsync(k)),
};

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, string[]>,
  ) {
    super(message);
  }
}

export function onSessionEnded(cb: () => void) {
  onSignedOut = cb;
}

export async function saveSession(res: AuthResponse) {
  accessToken = res.accessToken ?? null;
  if (res.refreshToken) await store.set(REFRESH_KEY, res.refreshToken);
}

export async function clearSession() {
  accessToken = null;
  await store.del(REFRESH_KEY);
}

export async function getRefreshToken() {
  return store.get(REFRESH_KEY);
}

/** Trade the stored refresh token for a new pair. Returns the user when it works. */
export async function restoreSession(): Promise<AuthResponse | null> {
  const refreshToken = await store.get(REFRESH_KEY);
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Client": "mobile" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      if (res.status === 401) await clearSession();
      return null;
    }
    const data = (await res.json()) as AuthResponse;
    await saveSession(data);
    return data;
  } catch {
    return null;
  }
}

async function refreshOnce(): Promise<boolean> {
  refreshing ??= restoreSession()
    .then((r) => Boolean(r))
    .finally(() => setTimeout(() => (refreshing = null), 0));
  return refreshing;
}

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

async function request<T>(method: Method, path: string, body?: unknown, retried = false): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1${path}`, {
      method,
      headers: {
        "X-Client": "mobile",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "NETWORK", "Can't reach caketown. Check your internet connection.");
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (res.ok) return data as T;

  const err = data?.error ?? {};
  if (res.status === 401 && !retried && (err.code === "TOKEN_EXPIRED" || (err.code === "UNAUTHORIZED" && !accessToken))) {
    if (await refreshOnce()) return request<T>(method, path, body, true);
    if (err.code === "TOKEN_EXPIRED") onSignedOut?.();
  }
  throw new ApiError(res.status, err.code ?? "ERROR", err.message ?? "Something went wrong. Please try again.", err.details);
}

export const api = {
  get: <T>(p: string) => request<T>("GET", p),
  post: <T>(p: string, b?: unknown) => request<T>("POST", p, b ?? {}),
  patch: <T>(p: string, b?: unknown) => request<T>("PATCH", p, b ?? {}),
  put: <T>(p: string, b?: unknown) => request<T>("PUT", p, b ?? {}),
  del: <T>(p: string) => request<T>("DELETE", p),
};

/** First message per field from a 422, plus a general message. */
export function errorsFrom(err: unknown): { fields: Record<string, string>; message?: string } {
  if (err instanceof ApiError) {
    if (err.details) return { fields: Object.fromEntries(Object.entries(err.details).map(([k, v]) => [k, v[0] ?? "Check this"])) };
    return { fields: {}, message: err.message };
  }
  return { fields: {}, message: "Something went wrong. Please try again." };
}
