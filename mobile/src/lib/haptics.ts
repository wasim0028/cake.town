import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

/** Small, consistent haptic vocabulary. No-ops on web. */
export const haptic = {
  tap: () => Platform.OS !== "web" && Haptics.selectionAsync().catch(() => undefined),
  add: () => Platform.OS !== "web" && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined),
  success: () => Platform.OS !== "web" && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined),
  warn: () => Platform.OS !== "web" && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined),
};
