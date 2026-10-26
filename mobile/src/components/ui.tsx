import { Image } from "expo-image";
import { Minus, Plus } from "lucide-react-native";
import React, { forwardRef, useEffect, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  FadeOutDown,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { formatINR } from "@caketown/shared";
import { BakeArt } from "@/art/BakeArt";
import { haptic } from "@/lib/haptics";
import { useToasts } from "@/lib/stores";
import { fonts, radius, space, type, useTheme } from "@/lib/theme";

/* ---------- text ---------- */

type Tone = "default" | "muted" | "accent" | "inverse" | "danger" | "fresh";

export function T({ tone = "default", size = "md", weight = "regular", style, ...p }: TextProps & { tone?: Tone; size?: keyof typeof type; weight?: "regular" | "medium" | "semi" | "bold" }) {
  const { c } = useTheme();
  const color = { default: c.text, muted: c.muted, accent: c.accentText, inverse: c.inverseText, danger: c.danger, fresh: c.fresh }[tone];
  const fontFamily = { regular: fonts.body, medium: fonts.bodyMedium, semi: fonts.bodySemi, bold: fonts.bodyBold }[weight];
  return <Text {...p} style={[{ color, fontFamily, fontSize: type[size], lineHeight: type[size] * 1.45 }, style]} />;
}

export function H({ size = "xl", tone = "default", style, ...p }: TextProps & { size?: keyof typeof type; tone?: Tone }) {
  const { c } = useTheme();
  const color = { default: c.text, muted: c.muted, accent: c.accentText, inverse: c.inverseText, danger: c.danger, fresh: c.fresh }[tone];
  return <Text accessibilityRole="header" {...p} style={[{ color, fontFamily: fonts.display, fontSize: type[size], lineHeight: type[size] * 1.15, letterSpacing: -0.3 }, style]} />;
}

/* ---------- pressable with a soft press-in scale ---------- */

const APressable = Animated.createAnimatedComponent(Pressable);

export function Press({ style, children, scaleTo = 0.96, onPressIn, onPressOut, ...p }: PressableProps & { style?: StyleProp<ViewStyle>; scaleTo?: number; children?: ReactNode }) {
  const s = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <APressable
      {...p}
      onPressIn={(e) => {
        s.value = withSpring(scaleTo, { damping: 18, stiffness: 400 });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        s.value = withSpring(1, { damping: 12, stiffness: 300 });
        onPressOut?.(e);
      }}
      style={[style, anim]}
    >
      {children}
    </APressable>
  );
}

/* ---------- button ---------- */

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  loading,
  disabled,
  icon,
  block,
  style,
  accessibilityLabel,
}: {
  title: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "caramel";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  block?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const { c } = useTheme();
  const bg = { primary: c.text, secondary: "transparent", ghost: "transparent", caramel: c.accent }[variant];
  const fg = { primary: c.bg, secondary: c.text, ghost: c.text, caramel: "#1F1611" }[variant];
  const h = { sm: 38, md: 48, lg: 56 }[size];
  return (
    <Press
      onPress={() => {
        haptic.tap();
        onPress?.();
      }}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={[
        styles.btn,
        { backgroundColor: bg, height: h, paddingHorizontal: size === "sm" ? 16 : 24, borderColor: variant === "secondary" ? c.lineStrong : "transparent", opacity: disabled ? 0.5 : 1 },
        block && { alignSelf: "stretch" },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon}
          <Text style={{ color: fg, fontFamily: fonts.bodySemi, fontSize: size === "sm" ? 14 : 16 }}>{title}</Text>
        </>
      )}
    </Press>
  );
}

export function IconButton({ onPress, children, label, style, filled }: { onPress?: () => void; children: ReactNode; label: string; style?: StyleProp<ViewStyle>; filled?: boolean }) {
  const { c } = useTheme();
  return (
    <Press
      onPress={() => {
        haptic.tap();
        onPress?.();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={[styles.iconBtn, { backgroundColor: filled ? c.surface : "transparent", borderColor: filled ? c.line : "transparent" }, style]}
    >
      {children}
    </Press>
  );
}

/* ---------- plate (product picture on a round plate) ---------- */

export function Plate({ name, category, image, size = 150, rim = true }: { name: string; category: string; image?: string; size?: number; rim?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.plate, alignItems: "center", justifyContent: "center", borderWidth: rim ? Math.max(4, size * 0.035) : 0, borderColor: c.plateRim }}>
      <View style={{ position: "absolute", width: size * 0.78, height: size * 0.78, borderRadius: size, backgroundColor: c.surface }} />
      {/* zIndex keeps the bake above the inner disc on every platform (web stacks absolute views on top) */}
      <View style={{ zIndex: 1 }}>
        {image ? (
          <Image source={{ uri: image }} style={{ width: size * 0.84, height: size * 0.84, borderRadius: size }} contentFit="cover" transition={200} />
        ) : (
          <BakeArt name={name} category={category} size={size * 0.86} />
        )}
      </View>
    </View>
  );
}

/* ---------- small bits ---------- */

export function Price({ value, from, style, size = "md" }: { value: number; from?: boolean; style?: StyleProp<TextStyle>; size?: keyof typeof type }) {
  return (
    <T size={size} weight="bold" style={style}>
      {from ? <T size="sm" tone="muted">from </T> : null}
      {formatINR(value)}
    </T>
  );
}

export function Tag({ label, tone = "fresh" }: { label: string; tone?: "fresh" | "accent" | "neutral" }) {
  const { c } = useTheme();
  const map = { fresh: [c.freshBg, c.fresh], accent: [c.accent, "#1F1611"], neutral: [c.plate, c.muted] } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill, alignSelf: "flex-start" }}>
      <Text style={{ color: fg, fontFamily: fonts.bodySemi, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

export function Chip({ label, selected, onPress, disabled }: { label: string; selected?: boolean; onPress?: () => void; disabled?: boolean }) {
  const { c } = useTheme();
  return (
    <Press
      onPress={() => {
        haptic.tap();
        onPress?.();
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      style={[styles.chip, { backgroundColor: selected ? c.text : c.surface, borderColor: selected ? c.text : c.lineStrong, opacity: disabled ? 0.4 : 1 }]}
    >
      <Text style={{ color: selected ? c.bg : c.text, fontFamily: fonts.bodyMedium, fontSize: 14 }}>{label}</Text>
    </Press>
  );
}

export function OptionList<V extends string>({ options, value, onChange, columns = 1 }: { options: { value: V; label: string; detail?: string; aside?: string; disabled?: boolean; visual?: ReactNode }[]; value?: V; onChange: (v: V) => void; columns?: number }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }} accessibilityRole="radiogroup">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Press
            key={o.value}
            onPress={() => {
              haptic.tap();
              onChange(o.value);
            }}
            disabled={o.disabled}
            accessibilityRole="radio"
            accessibilityState={{ checked: on, disabled: o.disabled }}
            style={[
              styles.option,
              { width: columns === 1 ? "100%" : `${100 / columns - 2}%`, backgroundColor: c.surface, borderColor: on ? c.text : c.lineStrong, borderWidth: on ? 2 : 1.5, opacity: o.disabled ? 0.45 : 1 },
            ]}
          >
            {o.visual}
            <View style={{ flex: 1 }}>
              <T weight="semi">{o.label}</T>
              {o.detail ? (
                <T size="xs" tone="muted">
                  {o.detail}
                </T>
              ) : null}
            </View>
            {o.aside ? (
              <T size="sm" weight="semi">
                {o.aside}
              </T>
            ) : null}
          </Press>
        );
      })}
    </View>
  );
}

export function Stepper({ value, onChange, min = 1, max = 20, compact }: { value: number; onChange: (v: number) => void; min?: number; max?: number; compact?: boolean }) {
  const { c } = useTheme();
  const size = compact ? 32 : 44;
  return (
    <View style={[styles.stepper, { borderColor: c.lineStrong, height: size + 4 }]}>
      <Pressable accessibilityLabel="Decrease" disabled={value <= min} onPress={() => (haptic.tap(), onChange(value - 1))} style={{ width: size, height: size, alignItems: "center", justifyContent: "center", opacity: value <= min ? 0.35 : 1 }}>
        <Minus size={16} color={c.text} />
      </Pressable>
      <T weight="bold" style={{ minWidth: 24, textAlign: "center" }}>
        {value}
      </T>
      <Pressable accessibilityLabel="Increase" disabled={value >= max} onPress={() => (haptic.tap(), onChange(value + 1))} style={{ width: size, height: size, alignItems: "center", justifyContent: "center", opacity: value >= max ? 0.35 : 1 }}>
        <Plus size={16} color={c.text} />
      </Pressable>
    </View>
  );
}

/* ---------- inputs ---------- */

export const Field = forwardRef<React.ComponentRef<typeof TextInput>, TextInputProps & { label: string; error?: string; hint?: string; optional?: boolean }>(function Field({ label, error, hint, optional, style, ...p }, ref) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <T weight="semi" size="sm">
        {label}
        {optional ? <T size="sm" tone="muted"> (optional)</T> : null}
      </T>
      <TextInput
        ref={ref}
        placeholderTextColor={c.muted}
        accessibilityLabel={label}
        {...p}
        style={[styles.input, { borderColor: error ? c.danger : c.lineStrong, backgroundColor: c.surface, color: c.text, fontFamily: fonts.body }, style]}
      />
      {error ? (
        <T size="xs" tone="danger" weight="medium">
          {error}
        </T>
      ) : hint ? (
        <T size="xs" tone="muted">
          {hint}
        </T>
      ) : null}
    </View>
  );
});

export function FormError({ message }: { message?: string }) {
  const { c } = useTheme();
  if (!message) return null;
  return (
    <View style={{ padding: 12, borderRadius: radius.md, backgroundColor: c.danger + "1F" }}>
      <T tone="danger" weight="medium" size="sm">
        {message}
      </T>
    </View>
  );
}

/* ---------- skeleton & empty ---------- */

export function Skeleton({ width = "100%", height = 16, round, style }: { width?: number | `${number}%`; height?: number; round?: boolean; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const o = useSharedValue(0.55);
  useEffect(() => {
    o.value = withRepeat(withTiming(1, { duration: 750, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [o]);
  const anim = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ width, height, borderRadius: round ? 999 : radius.sm, backgroundColor: c.plate }, anim, style]} />;
}

export function Empty({ title, body, action, art }: { title: string; body: string; action?: ReactNode; art?: [string, string] }) {
  return (
    <View style={{ alignItems: "center", paddingVertical: space[7], paddingHorizontal: space[5], gap: space[3] }}>
      {art ? <Plate name={art[0]} category={art[1]} size={130} /> : null}
      <H size="lg" style={{ textAlign: "center", marginTop: space[2] }}>
        {title}
      </H>
      <T tone="muted" style={{ textAlign: "center", maxWidth: 300 }}>
        {body}
      </T>
      {action}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return <View style={[{ backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.line, padding: space[4], gap: space[3] }, style]}>{children}</View>;
}

/* ---------- toasts ---------- */

export function Toaster({ bottom = 100 }: { bottom?: number }) {
  const { toasts, dismiss } = useToasts();
  const { c } = useTheme();
  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { justifyContent: "flex-end", paddingBottom: bottom, paddingHorizontal: 16 }]}>
      {toasts.map((t) => (
        <Animated.View key={t.id} entering={FadeInDown.springify().damping(16)} exiting={FadeOutDown.duration(200)} layout={LinearTransition} style={{ marginTop: 8 }}>
          <Pressable onPress={() => dismiss(t.id)} accessibilityRole="alert" style={[styles.toast, { backgroundColor: c.inverseBg }]}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.tone === "error" ? "#F0A39B" : t.tone === "success" ? "#8FA87C" : c.accent }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.inverseText, fontFamily: fonts.bodySemi, fontSize: 15 }}>{t.title}</Text>
              {t.body ? <Text style={{ color: c.inverseMuted, fontFamily: fonts.body, fontSize: 13, marginTop: 2 }}>{t.body}</Text> : null}
            </View>
          </Pressable>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", borderRadius: radius.pill, borderWidth: 1.5 },
  iconBtn: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  chip: { height: 38, paddingHorizontal: 16, borderRadius: radius.pill, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  option: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: radius.md, minHeight: 58 },
  stepper: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderRadius: radius.pill, paddingHorizontal: 2 },
  input: { minHeight: 50, borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: 14, fontSize: 16 },
  toast: { flexDirection: "row", gap: 12, alignItems: "center", padding: 14, borderRadius: radius.md, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
});
