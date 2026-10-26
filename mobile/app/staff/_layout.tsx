import { Stack, useRouter } from "expo-router";
import { View } from "react-native";
import { Button, H, T } from "@/components/ui";
import { useAuth } from "@/lib/stores";
import { fonts, useTheme } from "@/lib/theme";

/** Staff section: only admin accounts get past this point. */
export default function StaffLayout() {
  const user = useAuth((s) => s.user);
  const router = useRouter();
  const { c } = useTheme();

  if (user?.role !== "admin") {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, padding: 24, justifyContent: "center", gap: 12 }}>
        <H size="xl">Staff only</H>
        <T tone="muted">{user ? `${user.email} isn't a staff account.` : "Sign in with a staff account to see orders and the kitchen list."}</T>
        <Button title={user ? "Back to the shop" : "Sign in"} onPress={() => (user ? router.replace("/(tabs)") : router.push("/login"))} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: c.bg },
        headerTintColor: c.text,
        headerTitleStyle: { fontFamily: fonts.display, fontSize: 18 },
        headerBackButtonDisplayMode: "minimal",
        contentStyle: { backgroundColor: c.bg },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="index" options={{ title: "Staff" }} />
      <Stack.Screen name="orders" options={{ title: "Orders" }} />
      <Stack.Screen name="order/[id]" options={{ title: "Order" }} />
      <Stack.Screen name="kitchen" options={{ title: "Kitchen list" }} />
      <Stack.Screen name="stock" options={{ title: "Stock" }} />
      <Stack.Screen name="messages" options={{ title: "Messages" }} />
    </Stack>
  );
}
