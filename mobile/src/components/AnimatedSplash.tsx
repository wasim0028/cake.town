import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { BakeArt } from "@/art/BakeArt";
import { fonts, useTheme } from "@/lib/theme";

/**
 * The first second of the app: the truffle cake drops onto its plate with a little squash,
 * the wordmark rises, then everything fades into the home screen.
 */
export function AnimatedSplash({ onDone }: { onDone: () => void }) {
  const { c } = useTheme();
  const drop = useSharedValue(-60);
  const squash = useSharedValue(1);
  const word = useSharedValue(0);
  const fade = useSharedValue(1);

  useEffect(() => {
    drop.value = withSpring(0, { damping: 9, stiffness: 140 });
    squash.value = withDelay(260, withSequence(withTiming(0.9, { duration: 110 }), withSpring(1, { damping: 6 })));
    word.value = withDelay(380, withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }));
    fade.value = withDelay(1300, withTiming(0, { duration: 380 }, (done) => done && runOnJS(onDone)()));
  }, [drop, squash, word, fade, onDone]);

  const cake = useAnimatedStyle(() => ({ transform: [{ translateY: drop.value }, { scaleY: squash.value }, { scaleX: 2 - squash.value }] }));
  const wordStyle = useAnimatedStyle(() => ({ opacity: word.value, transform: [{ translateY: (1 - word.value) * 16 }] }));
  const root = useAnimatedStyle(() => ({ opacity: fade.value }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, { backgroundColor: c.bg }, root]} pointerEvents="none">
      <View style={[styles.plate, { backgroundColor: c.plate, borderColor: c.plateRim }]}>
        <Animated.View style={cake}>
          <BakeArt name="Chocolate Truffle Cake" category="cakes" size={150} />
        </Animated.View>
      </View>
      <Animated.Text style={[styles.word, { color: c.text }, wordStyle]}>
        cake<Animated.Text style={{ color: c.accentText }}>town</Animated.Text>
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: "center", justifyContent: "center", zIndex: 100 },
  plate: { width: 190, height: 190, borderRadius: 95, borderWidth: 7, alignItems: "center", justifyContent: "center" },
  word: { marginTop: 22, fontFamily: fonts.display, fontSize: 40, letterSpacing: -1 },
});
