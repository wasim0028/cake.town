import type { useRouter } from "expo-router";
import type { AuthResponse } from "@caketown/shared";
import { api, clearSession, getRefreshToken, saveSession } from "./api";
import { registerForPush, unregisterPush } from "./push";
import { useAuth } from "./stores";

export async function signedIn(res: AuthResponse) {
  await saveSession(res);
  useAuth.getState().setUser(res.user);
  void registerForPush();
}

export async function signOut() {
  await unregisterPush();
  const refreshToken = await getRefreshToken();
  await api.post("/auth/logout", refreshToken ? { refreshToken } : {}).catch(() => undefined);
  await clearSession();
  useAuth.getState().setUser(null);
}

/** Close the sign-in sheet and continue where the person was going (e.g. checkout). */
export function afterAuth(router: ReturnType<typeof useRouter>, next?: string) {
  if (router.canDismiss()) router.dismissAll();
  if (next) router.push(next as never);
}
