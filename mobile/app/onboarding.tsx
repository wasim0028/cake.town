import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { FlatList, StyleSheet, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import Animated, { interpolate, useAnimatedStyle, useSharedValue, Extrapolation, type SharedValue } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, H, Plate, T } from "@/components/ui";
import { haptic } from "@/lib/haptics";
import { usePrefs } from "@/lib/stores";
import { useTheme } from "@/lib/theme";

const SLIDES = [
  { art: ["Chocolate Truffle Cake", "cakes"], title: "Baked after you order", body: "Cakes start in our oven when your order comes in, timed to reach you the same day." },
  { art: ["Classic Sourdough Loaf", "breads"], title: "Pick a three-hour slot", body: "Choose when it arrives. We'll tell you as it moves from the oven to your door." },
  { art: ["Vanilla Rainbow Cupcakes", "cupcakes"], title: "Make it yours", body: "Design a cake, ask for eggless, add a message. New here? WELCOME10 takes 10% off your first order." },
] as const;

function Dot({ i, x, width }: { i: number; x: SharedValue<number>; width: number }) {
  const { c } = useTheme();
  const style = useAnimatedStyle(() => {
    const p = x.value / width;
    return {
      width: interpolate(p, [i - 1, i, i + 1], [8, 26, 8], Extrapolation.CLAMP),
      opacity: interpolate(p, [i - 1, i, i + 1], [0.35, 1, 0.35], Extrapolation.CLAMP),
    };
  });
  return <Animated.View style={[{ height: 8, borderRadius: 4, backgroundColor: c.text }, style]} />;
}

export default function Onboarding() {
  const { width } = useWindowDimensions();
  const { c } = useTheme();
  const router = useRouter();
  const setPrefs = usePrefs((s) => s.set);
  const x = useSharedValue(0);
  const list = useRef<FlatList>(null);
  const [index, setIndex] = useState(0);

  const finish = () => {
    haptic.success();
    setPrefs({ onboarded: true });
    router.replace("/(tabs)");
  };
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    x.value = e.nativeEvent.contentOffset.x;
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  };
  const last = index === SLIDES.length - 1;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]}>
      <View style={styles.top}>
        <T weight="semi" tone="muted" onPress={finish} accessibilityRole="button">
          Skip
        </T>
      </View>
      <FlatList
        ref={list}
        data={SLIDES}
        keyExtractor={(s) => s.title}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item, index: i }) => <Slide item={item} i={i} x={x} width={width} />}
      />
      <View style={styles.bottom}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <Dot key={i} i={i} x={x} width={width} />
          ))}
        </View>
        <Button
          title={last ? "Start ordering" : "Next"}
          size="lg"
          block
          onPress={() => (last ? finish() : list.current?.scrollToOffset({ offset: (index + 1) * width, animated: true }))}
        />
      </View>
    </SafeAreaView>
  );
}

function Slide({ item, i, x, width }: { item: (typeof SLIDES)[number]; i: number; x: SharedValue<number>; width: number }) {
  // The plate rolls in and the text drifts at a different speed (parallax).
  const plate = useAnimatedStyle(() => {
    const p = x.value / width - i;
    return { transform: [{ translateX: p * -width * 0.3 }, { rotate: `${p * -40}deg` }, { scale: interpolate(Math.abs(p), [0, 1], [1, 0.7]) }] };
  });
  const text = useAnimatedStyle(() => {
    const p = x.value / width - i;
    return { opacity: interpolate(Math.abs(p), [0, 0.6], [1, 0], Extrapolation.CLAMP), transform: [{ translateX: p * -width * 0.15 }] };
  });
  return (
    <View style={{ width, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 32 }}>
      <Animated.View style={plate}>
        <Plate name={item.art[0]} category={item.art[1]} size={Math.min(260, width * 0.66)} />
      </Animated.View>
      <Animated.View style={[{ gap: 12, alignItems: "center" }, text]}>
        <H size="xxl" style={{ textAlign: "center" }}>
          {item.title}
        </H>
        <T tone="muted" size="md" style={{ textAlign: "center", maxWidth: 320 }}>
          {item.body}
        </T>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  top: { alignItems: "flex-end", paddingHorizontal: 24, paddingTop: 8, height: 40 },
  bottom: { padding: 24, gap: 24 },
  dots: { flexDirection: "row", gap: 8, justifyContent: "center", alignItems: "center" },
});
