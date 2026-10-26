import { Alert, Platform } from "react-native";

/** Yes/no question that works in the app and in the web preview (where Alert buttons don't exist). */
export function confirm(title: string, body: string, yes: string, destructive = false): Promise<boolean> {
  if (Platform.OS === "web") return Promise.resolve(globalThis.confirm?.(`${title}\n\n${body}`) ?? true);
  return new Promise((resolve) =>
    Alert.alert(title, body, [
      { text: "Not now", style: "cancel", onPress: () => resolve(false) },
      { text: yes, style: destructive ? "destructive" : "default", onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) }),
  );
}
