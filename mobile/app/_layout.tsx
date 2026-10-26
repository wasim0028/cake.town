// Import single weights so only these font files end up in the app.
import { DMSans_400Regular } from "@expo-google-fonts/dm-sans/400Regular";
import { DMSans_500Medium } from "@expo-google-fonts/dm-sans/500Medium";
import { DMSans_600SemiBold } from "@expo-google-fonts/dm-sans/600SemiBold";
import { DMSans_700Bold } from "@expo-google-fonts/dm-sans/700Bold";
import { Fraunces_500Medium } from "@expo-google-fonts/fraunces/500Medium";
import { Fraunces_600SemiBold } from "@expo-google-fonts/fraunces/600SemiBold";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useCallback, useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AnimatedSplash } from "@/components/AnimatedSplash";
import { Toaster } from "@/components/ui";
import { ApiError, onSessionEnded, restoreSession } from "@/lib/api";
import { registerForPush, listenForNotificationTaps } from "@/lib/push";
import { toast, useAuth } from "@/lib/stores";
import { fonts, useTheme } from "@/lib/theme";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: (n, e) => !(e instanceof ApiError && e.status > 0 && e.status < 500) && n < 2,
    },
  },
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Fraunces_500Medium, Fraunces_600SemiBold, DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold });
  const [sessionChecked, setSessionChecked] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const setUser = useAuth((s) => s.setUser);
  const { c, scheme } = useTheme();

  // Sign back in with the refresh token in the keychain.
  useEffect(() => {
    restoreSession()
      .then((r) => {
        setUser(r?.user ?? null);
        if (r) void registerForPush();
      })
      .finally(() => setSessionChecked(true));
    onSessionEnded(() => {
      setUser(null);
      toast("Please sign in again", { body: "Your session ended." });
    });
    return listenForNotificationTaps();
  }, [setUser]);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(c.bg).catch(() => undefined);
  }, [c.bg]);

  const ready = fontsLoaded && sessionChecked;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);
  const finishSplash = useCallback(() => setSplashDone(true), []);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: c.bg }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style={scheme === "dark" ? "light" : "dark"} />
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
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false, animation: "fade" }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: "fade" }} />
            <Stack.Screen name="product/[slug]" options={{ headerShown: false }} />
            <Stack.Screen name="builder" options={{ title: "Design a cake" }} />
            <Stack.Screen name="checkout" options={{ title: "Checkout" }} />
            <Stack.Screen name="order/[id]" options={{ title: "Your order" }} />
            <Stack.Screen name="class/[slug]" options={{ title: "Baking class" }} />
            <Stack.Screen name="orders" options={{ title: "Orders" }} />
            <Stack.Screen name="addresses" options={{ title: "Addresses" }} />
            <Stack.Screen name="wishlist" options={{ title: "Favourites" }} />
            <Stack.Screen name="bookings" options={{ title: "Class bookings" }} />
            <Stack.Screen name="settings" options={{ title: "Settings" }} />
            <Stack.Screen name="login" options={{ presentation: "modal", title: "Sign in" }} />
            <Stack.Screen name="signup" options={{ presentation: "modal", title: "Create account" }} />
            <Stack.Screen name="otp" options={{ presentation: "modal", title: "Sign in with OTP" }} />
          </Stack>
          <Toaster />
          {!splashDone && <AnimatedSplash onDone={finishSplash} />}
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
