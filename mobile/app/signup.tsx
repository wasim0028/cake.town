import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import type { AuthResponse } from "@caketown/shared";
import { Screen } from "@/components/Screen";
import { Button, Field, FormError, H, T } from "@/components/ui";
import { api, errorsFrom } from "@/lib/api";
import { afterAuth, signedIn } from "@/lib/auth";
import { haptic } from "@/lib/haptics";
import { toast } from "@/lib/stores";

export default function Signup() {
  const router = useRouter();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [f, setF] = useState({ name: "", email: "", phone: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<{ fields: Record<string, string>; message?: string }>({ fields: {} });
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));

  const submit = async () => {
    setBusy(true);
    setErrors({ fields: {} });
    try {
      const res = await api.post<AuthResponse>("/auth/signup", { ...f, email: f.email.trim(), confirmPassword: f.password });
      await signedIn(res);
      haptic.success();
      toast(`Welcome to caketown, ${res.user.name.split(" ")[0]}!`, { tone: "success", body: "WELCOME10 takes 10% off your first order." });
      afterAuth(router, next);
    } catch (e) {
      haptic.warn();
      setErrors(errorsFrom(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen header={false}>
        <View style={{ gap: 6 }}>
          <H size="xxl">Create your account</H>
          <T tone="muted">Save addresses, reorder in two taps and follow every order live.</T>
        </View>
        <Field label="Your name" value={f.name} onChangeText={set("name")} autoComplete="name" textContentType="name" error={errors.fields.name} />
        <Field label="Email" value={f.email} onChangeText={set("email")} autoCapitalize="none" keyboardType="email-address" autoComplete="email" error={errors.fields.email} />
        <Field label="Mobile number" value={f.phone} onChangeText={set("phone")} keyboardType="phone-pad" autoComplete="tel" placeholder="98765 43210" hint="For delivery updates. We never share it." error={errors.fields.phone} />
        <Field label="Password" value={f.password} onChangeText={set("password")} secureTextEntry autoComplete="new-password" textContentType="newPassword" hint="8+ characters with a letter and a number" error={errors.fields.password} />
        <FormError message={errors.message} />
        <Button title="Create account" size="lg" loading={busy} onPress={submit} />
        <T tone="muted" style={{ textAlign: "center" }}>
          Already have an account?{" "}
          <T tone="accent" weight="semi" onPress={() => router.replace({ pathname: "/login", params: next ? { next } : {} })} accessibilityRole="link">
            Sign in
          </T>
        </T>
      </Screen>
    </KeyboardAvoidingView>
  );
}
