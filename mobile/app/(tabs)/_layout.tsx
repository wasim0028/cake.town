import { Tabs, type BottomTabBarProps } from "expo-router/js-tabs";
import { CalendarHeart, House, ShoppingBag, Store, User } from "lucide-react-native";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { haptic } from "@/lib/haptics";
import { cartCount, useCart } from "@/lib/stores";
import { fonts, useTheme } from "@/lib/theme";

const ICONS = { index: House, shop: Store, classes: CalendarHeart, cart: ShoppingBag, account: User } as const;
const LABELS = { index: "Home", shop: "Menu", classes: "Classes", cart: "Cart", account: "Account" } as const;

/** Floating tab bar: a caramel pill slides under the active tab; the cart badge bounces on add. */
function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const barWidth = Math.min(width - 24, 520);
  const tabWidth = barWidth / state.routes.length;
  const x = useSharedValue(state.index * tabWidth);
  const items = useCart((s) => s.items);
  const bumpKey = useCart((s) => s.bumpKey);
  const bump = useSharedValue(1);
  const count = cartCount(items);

  useEffect(() => {
    x.value = withSpring(state.index * tabWidth, { damping: 18, stiffness: 220 });
  }, [state.index, tabWidth, x]);
  useEffect(() => {
    if (bumpKey) bump.value = withSequence(withTiming(1.45, { duration: 120 }), withSpring(1, { damping: 5 }));
  }, [bumpKey, bump]);

  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const badge = useAnimatedStyle(() => ({ transform: [{ scale: bump.value }] }));

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]} pointerEvents="box-none">
      <View style={[styles.bar, { width: barWidth, backgroundColor: c.inverseBg }]}>
        <Animated.View style={[styles.pill, { width: tabWidth - 10, backgroundColor: c.accent }, pill]} />
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const name = route.name as keyof typeof ICONS;
          const Icon = ICONS[name] ?? House;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={name === "cart" ? `Cart, ${count} items` : LABELS[name]}
              onPress={() => {
                haptic.tap();
                if (!focused) navigateToTab(route.key);
              }}
              style={[styles.tab, { width: tabWidth }]}
            >
              <View>
                <Icon size={21} color={focused ? "#1F1611" : c.inverseMuted} strokeWidth={focused ? 2.4 : 2} />
                {name === "cart" && count > 0 && (
                  <Animated.View style={[styles.badge, { backgroundColor: focused ? "#1F1611" : c.accent, borderColor: c.inverseBg }, badge]}>
                    <Text style={{ color: focused ? c.accent : "#1F1611", fontFamily: fonts.bodyBold, fontSize: 10 }}>{count > 99 ? "99+" : count}</Text>
                  </Animated.View>
                )}
              </View>
              <Text style={{ color: focused ? "#1F1611" : c.inverseMuted, fontFamily: focused ? fonts.bodySemi : fonts.bodyMedium, fontSize: 11, marginTop: 2 }}>{LABELS[name]}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="shop" />
      <Tabs.Screen name="classes" />
      <Tabs.Screen name="cart" />
      <Tabs.Screen name="account" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, bottom: 0, alignItems: "center" },
  bar: { flexDirection: "row", height: 64, borderRadius: 32, alignItems: "center", paddingHorizontal: 0, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  pill: { position: "absolute", left: 5, height: 54, borderRadius: 27 },
  tab: { height: 64, alignItems: "center", justifyContent: "center", zIndex: 1 },
  badge: { position: "absolute", top: -6, right: -10, minWidth: 18, height: 18, borderRadius: 9, borderWidth: 2, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
});
