import { useRouter } from "expo-router";
import { Check } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { ScrollView, Switch, useWindowDimensions, View } from "react-native";
import Animated, { FadeIn, FadeInRight, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  CAKE_FROSTINGS,
  CAKE_SHAPES,
  CAKE_TOPPINGS,
  customCakeExtra,
  describeCustomization,
  formatINR,
  MAX_TOPPINGS,
  type CakeFrostingId,
  type CakeShapeId,
  type CakeToppingId,
} from "@caketown/shared";
import { BuilderCake, SPONGE_COLORS } from "@/art/BuilderCake";
import { Row } from "@/components/Screen";
import { Button, Chip, Empty, Field, H, OptionList, Press, Skeleton, T } from "@/components/ui";
import { nextDeliverySlot } from "@/lib/delivery";
import { haptic } from "@/lib/haptics";
import { useProduct } from "@/lib/queries";
import { toast, useCart } from "@/lib/stores";
import { radius, useTheme } from "@/lib/theme";

const STEPS = ["Shape", "Size", "Sponge", "Frosting", "Toppings", "Finish"] as const;
const TITLES = ["Pick a shape", "How many people?", "Choose the sponge", "Choose the frosting", `Add up to ${MAX_TOPPINGS} toppings`, "Add a message"];

/** Counts to the new price instead of jumping. */
function useTween(value: number) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = Date.now();
    const a = from.current;
    let raf = 0;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / 420);
      setShown(Math.round(a + (value - a) * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      from.current = value;
    };
  }, [value]);
  return shown;
}

export default function Builder() {
  const router = useRouter();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const product = useProduct("design-your-own-cake");
  const add = useCart((s) => s.add);

  const [step, setStep] = useState(0);
  const [shape, setShape] = useState<CakeShapeId>("round");
  const [variantId, setVariantId] = useState<string>();
  const [sponge, setSponge] = useState<string>();
  const [frosting, setFrosting] = useState<CakeFrostingId>("fresh-cream");
  const [toppings, setToppings] = useState<CakeToppingId[]>([]);
  const [message, setMessage] = useState("");
  const [eggless, setEggless] = useState(false);
  const [added, setAdded] = useState(false);

  const p = product.data;
  const variant = p?.variants.find((v) => v.id === variantId) ?? p?.variants.find((v) => v.inStock) ?? p?.variants[0];
  const flavour = sponge ?? p?.flavours[0] ?? "Vanilla";
  const custom = { shape, frosting, toppings };
  const price = (variant?.price ?? 0) + customCakeExtra(custom) + (eggless ? (p?.egglessOption.extraPrice ?? 0) : 0);
  const shown = useTween(price);

  if (product.isPending) return <View style={{ flex: 1, backgroundColor: c.bg, padding: 20 }}><Skeleton height={260} /></View>;
  if (!p?.isCustomizable || !variant) {
    return <Empty title="The cake designer is resting" body="Our ready-made cakes can still carry your message." action={<Button title="See the cakes" onPress={() => router.replace({ pathname: "/(tabs)/shop", params: { category: "cakes" } })} />} />;
  }

  const go = (n: number) => {
    haptic.tap();
    setStep(n);
  };

  const addToCart = () => {
    haptic.success();
    add({
      productId: p.id,
      variantId: variant.id,
      slug: p.slug,
      name: `Your ${shape} ${flavour.toLowerCase()} cake`,
      category: "cakes",
      variantLabel: variant.label,
      unitPrice: price,
      eggless,
      flavour,
      ...(message.trim() ? { message: message.trim() } : {}),
      custom,
      customSummary: describeCustomization(custom),
    });
    setAdded(true);
    toast("Your cake is in the cart", { tone: "success", body: `${variant.label} · ${formatINR(price)}` });
  };

  const slot = nextDeliverySlot(p.preparationHours);
  const last = step === STEPS.length - 1;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {/* live preview */}
      <View style={{ height: Math.min(300, height * 0.34), backgroundColor: c.plate, paddingHorizontal: 30, paddingTop: 10 }}>
        <Animated.View key={`${shape}-${flavour}-${frosting}`} entering={ZoomIn.springify().damping(12)} style={{ flex: 1 }}>
          <BuilderCake shape={shape} sponge={flavour} frosting={frosting} toppings={toppings} message={message.trim()} />
        </Animated.View>
        <Row style={{ position: "absolute", left: 16, right: 16, bottom: 12, justifyContent: "space-between", backgroundColor: c.inverseBg, borderRadius: radius.pill, paddingHorizontal: 18, paddingVertical: 10 }}>
          <T size="sm" style={{ color: c.inverseMuted }} numberOfLines={1}>
            {variant.label} · {flavour}
          </T>
          <T size="lg" weight="bold" tone="inverse" accessibilityLiveRegion="polite">
            {formatINR(Math.round(shown / 100) * 100)}
          </T>
        </Row>
      </View>

      {/* steps */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 6 }} style={{ flexGrow: 0 }}>
        {STEPS.map((s, i) => {
          const state = i < step ? "done" : i === step ? "current" : "todo";
          return (
            <Press key={s} onPress={() => go(i)} accessibilityRole="button" accessibilityState={{ selected: i === step }} accessibilityLabel={`Step ${i + 1}: ${s}`} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingRight: 10 }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: state === "current" ? c.text : state === "done" ? c.freshBg : "transparent", borderWidth: 1.5, borderColor: state === "current" ? c.text : state === "done" ? c.fresh : c.lineStrong }}>
                {state === "done" ? <Check size={12} color={c.fresh} /> : <T size="xs" weight="bold" style={{ color: state === "current" ? c.bg : c.muted }}>{i + 1}</T>}
              </View>
              <T size="sm" weight={state === "current" ? "semi" : "regular"} tone={state === "current" ? "default" : "muted"}>
                {s}
              </T>
            </Press>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 4, gap: 16, paddingBottom: 120 + insets.bottom }} keyboardShouldPersistTaps="handled">
        <Animated.View key={step} entering={FadeInRight.springify().damping(18)} style={{ gap: 16 }}>
          <H size="xl">{TITLES[step]}</H>

          {step === 0 && (
            <OptionList
              columns={3}
              value={shape}
              onChange={setShape}
              options={CAKE_SHAPES.map((s) => ({ value: s.id, label: s.label, detail: s.price ? `+${formatINR(s.price)}` : "Included" }))}
            />
          )}
          {step === 1 && (
            <OptionList
              value={variant.id}
              onChange={setVariantId}
              options={p.variants.map((v) => ({ value: v.id, label: v.label, detail: v.weightGrams ? `Serves ${Math.max(4, Math.round(v.weightGrams / 100) - 1)}–${Math.round(v.weightGrams / 100) + 1}` : undefined, aside: formatINR(v.price), disabled: !v.inStock }))}
            />
          )}
          {step === 2 && (
            <OptionList
              columns={2}
              value={flavour}
              onChange={setSponge}
              options={p.flavours.map((f) => ({ value: f, label: f, visual: <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: SPONGE_COLORS[f] ?? "#EBC98A", borderWidth: 1, borderColor: "rgba(0,0,0,0.1)" }} /> }))}
            />
          )}
          {step === 3 && (
            <OptionList
              columns={2}
              value={frosting}
              onChange={setFrosting}
              options={CAKE_FROSTINGS.map((f) => ({ value: f.id, label: f.label, detail: f.price ? `+${formatINR(f.price)}` : "Included", visual: <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: f.color, borderWidth: 1, borderColor: "rgba(0,0,0,0.12)" }} /> }))}
            />
          )}
          {step === 4 && (
            <>
              <Row style={{ flexWrap: "wrap", gap: 8 }}>
                {CAKE_TOPPINGS.map((t) => {
                  const on = toppings.includes(t.id);
                  return (
                    <Chip
                      key={t.id}
                      label={`${t.label} · +${formatINR(t.price)}`}
                      selected={on}
                      disabled={!on && toppings.length >= MAX_TOPPINGS}
                      onPress={() => setToppings((x) => (on ? x.filter((y) => y !== t.id) : [...x, t.id]))}
                    />
                  );
                })}
              </Row>
              <T size="sm" tone="muted">
                {toppings.length}/{MAX_TOPPINGS} chosen. Toppings are optional.
              </T>
            </>
          )}
          {step === 5 && (
            <>
              <Field label="Message on the cake" optional value={message} onChangeText={setMessage} maxLength={p.maxMessageLength} placeholder="Happy birthday, Ma!" hint={`${message.length}/${p.maxMessageLength} characters`} />
              {p.egglessOption.available && (
                <Row style={{ justifyContent: "space-between", backgroundColor: c.surface, borderRadius: radius.md, borderWidth: 1.5, borderColor: c.lineStrong, padding: 14 }}>
                  <View>
                    <T weight="semi">Make it eggless</T>
                    <T size="xs" tone="muted">
                      +{formatINR(p.egglessOption.extraPrice)}
                    </T>
                  </View>
                  <Switch value={eggless} onValueChange={setEggless} trackColor={{ true: c.fresh, false: c.lineStrong }} thumbColor="#fff" accessibilityLabel="Make it eggless" />
                </Row>
              )}
              <Animated.View entering={FadeIn} style={{ backgroundColor: c.freshBg, padding: 14, borderRadius: radius.md }}>
                <T size="sm" tone="fresh">
                  Designed cakes take about {p.preparationHours} hours. Earliest delivery {slot.day}, {slot.label}.
                </T>
              </Animated.View>
            </>
          )}
        </Animated.View>
      </ScrollView>

      <Row style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 12, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.line }}>
        {step > 0 && <Button title="Back" variant="ghost" onPress={() => go(step - 1)} />}
        {!last ? (
          <Button title={`Next: ${STEPS[step + 1]}`} size="lg" style={{ flex: 1 }} onPress={() => go(step + 1)} />
        ) : added ? (
          <Button title="Go to cart" size="lg" style={{ flex: 1 }} onPress={() => router.navigate("/(tabs)/cart")} />
        ) : (
          <Button title={`Add to cart · ${formatINR(price)}`} size="lg" style={{ flex: 1 }} onPress={addToCart} />
        )}
      </Row>
    </View>
  );
}
