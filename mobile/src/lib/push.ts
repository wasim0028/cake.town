import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { Platform } from "react-native";
import { api } from "./api";

/** Show order updates even while the app is open. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

let registeredToken: string | null = null;

/**
 * Asks for permission (once), gets this phone's Expo push token and tells the API, so order
 * status changes arrive as notifications. Needs a physical device and an EAS project id
 * (set by `eas init`); otherwise it quietly does nothing.
 */
export async function registerForPush(): Promise<"ok" | "denied" | "unavailable"> {
  if (Platform.OS === "web" || !Device.isDevice) return "unavailable";
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("orders", {
      name: "Orders",
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: "#C8893B",
    });
  }
  const current = await Notifications.getPermissionsAsync();
  let status = current.status;
  if (status !== "granted" && current.canAskAgain) status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== "granted") return "denied";

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return "unavailable";
  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    registeredToken = data;
    await api.post("/me/devices", { token: data, platform: Platform.OS === "ios" ? "ios" : "android" });
    return "ok";
  } catch {
    return "unavailable";
  }
}

/** Forget this phone when signing out, so the next person doesn't get the notifications. */
export async function unregisterPush() {
  if (!registeredToken) return;
  await api.del(`/me/devices/${encodeURIComponent(registeredToken)}`).catch(() => undefined);
  registeredToken = null;
}

/** Tapping a notification opens the order (or booking) it is about. */
export function listenForNotificationTaps() {
  const open = (data: Record<string, unknown> | undefined) => {
    if (data?.screen === "order" && typeof data.id === "string") router.push({ pathname: "/order/[id]", params: { id: data.id } });
    if (data?.screen === "booking") router.push("/bookings");
    if (data?.screen === "staff-order" && typeof data.id === "string") router.push({ pathname: "/staff/order/[id]", params: { id: data.id } });
    if (data?.screen === "staff-messages") router.push("/staff/messages");
  };
  Notifications.getLastNotificationResponseAsync().then((r) => r && open(r.notification.request.content.data));
  const sub = Notifications.addNotificationResponseReceivedListener((r) => open(r.notification.request.content.data));
  return () => sub.remove();
}
