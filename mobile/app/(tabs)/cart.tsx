import { useRouter } from "expo-router";
import { Trash2 } from "lucide-react-native";
import { useEffect } from "react";
import { View } from "react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated, { FadeOut, LinearTransition, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from "react-native-reanimated";
import { DELIVERY, formatINR } from "@caketown/shared";
import { Row, Screen } from "@/components/Screen";
import { Button, Empty, H, Plate, Press, Stepper, T } from "@/components/ui";
import { haptic } from "@/lib/haptics";
import { cartSubtotal, useAuth, useCart, type CartItem } from "@/lib/stores";
import { radius, useTheme } from "@/lib/theme";

function DeleteAction({ drag }: { drag: SharedValue<number> }) {
  const { c } = useTheme();
  const style = useAnimatedStyle(() => ({ transform: [{ scale: Math.min(1.2, Math.max(0.6, -drag.value / 80)) }] }));
  return (
    <View style={{ width: 96, justifyContent: "center", alignItems: "center", backgroundColor: c.danger, borderRadius: radius.lg, marginLeft: 10 }}>
      <Animated.View style={[{ alignItems: "center", gap: 4 }, style]}>
        <Trash2 size={22} color="#fff" />
        <T size="xs" style={{ color: "#fff" }} weight="semi">
          Remove
        </T>
      </Animated.View>
    </View>
  );
}

function Line({ item }: { item: CartItem }) {
  const { c } = useTheme();
  const router = useRouter();
  const { setQuantity, remove } = useCart();
  return (
    <Animated.View exiting={FadeOut.duration(180)} layout={LinearTransition.springify().damping(18)}>
      <ReanimatedSwipeable
        friction={1.6}
        rightThreshold={70}
        overshootRight={false}
        renderRightActions={(_p, drag) => <DeleteAction drag={drag} />}
        onSwipeableOpen={() => {
          haptic.warn();
          remove(item.key);
        }}
      >
        <View style={{ flexDirection: "row", gap: 14, padding: 12, backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.line, alignItems: "center" }}>
          <Press onPress={() => router.push({ pathname: "/product/[slug]", params: { slug: item.slug } })} accessibilityLabel={`Open ${item.name}`}>
            <Plate name={item.name} category={item.category} image={item.image} size={72} />
          </Press>
          <View style={{ flex: 1, gap: 3 }}>
            <T weight="semi" numberOfLines={2}>
              {item.name}
            </T>
            <T size="xs" tone="muted">
              {[item.variantLabel, item.flavour, item.eggless && "eggless"].filter(Boolean).join(" · ")}
            </T>
            {item.customSummary ? (
              <T size="xs" tone="muted" numberOfLines={2}>
                {item.customSummary}
              </T>
            ) : null}
            {item.message ? (
              <T size="xs" tone="muted">
                “{item.message}”
              </T>
            ) : null}
            <Row style={{ justifyContent: "space-between", marginTop: 6 }}>
              <Stepper compact value={item.quantity} onChange={(q) => setQuantity(item.key, q)} />
              <T weight="bold">{formatINR(item.unitPrice * item.quantity)}</T>
            </Row>
          </View>
        </View>
      </ReanimatedSwipeable>
    </Animated.View>
  );
}

export default function CartTab() {
  const router = useRouter();
  const { c } = useTheme();
  const items = useCart((s) => s.items);
  const user = useAuth((s) => s.user);
  const subtotal = cartSubtotal(items);
  const toFree = Math.max(0, DELIVERY.freeAbove - subtotal);
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(Math.min(1, subtotal / DELIVERY.freeAbove), { duration: 500 });
  }, [subtotal, progress]);
  const meter = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  if (!items.length) {
    return (
      <Screen tabs>
        <H size="xxl">Your cart</H>
        <Empty art={["Butter Croissant", "pastries"]} title="Nothing here yet" body="Today's bestsellers are a good place to start." action={<Button title="Browse the menu" onPress={() => router.navigate("/(tabs)/shop")} />} />
      </Screen>
    );
  }

  return (
    <Screen tabs>
      <Row style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
        <H size="xxl">Your cart</H>
        <T size="sm" tone="muted">
          Swipe left to remove
        </T>
      </Row>
      <View style={{ gap: 12 }}>
        {items.map((i) => (
          <Line key={i.key} item={i} />
        ))}
      </View>

      <View style={{ gap: 8 }}>
        <T size="sm" tone="muted">
          {toFree > 0 ? `Add ${formatINR(toFree)} more for free delivery` : "Delivery is free on this order"}
        </T>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: c.plate, overflow: "hidden" }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(Math.min(1, subtotal / DELIVERY.freeAbove) * 100) }}>
          <Animated.View style={[{ height: "100%", backgroundColor: toFree > 0 ? c.accent : c.fresh, borderRadius: 4 }, meter]} />
        </View>
      </View>

      <View style={{ gap: 6, padding: 16, backgroundColor: c.plate, borderRadius: radius.lg }}>
        <Row style={{ justifyContent: "space-between" }}>
          <T tone="muted">Subtotal</T>
          <T size="lg" weight="bold">
            {formatINR(subtotal)}
          </T>
        </Row>
        <T size="xs" tone="muted">
          Delivery fee and coupons are worked out at checkout.
        </T>
      </View>

      <Button title={user ? "Choose a delivery slot" : "Sign in to check out"} size="lg" onPress={() => router.push(user ? "/checkout" : { pathname: "/login", params: { next: "/checkout" } })} />
    </Screen>
  );
}
