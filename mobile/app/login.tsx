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

export default function Login() {
  const router = useRouter();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<{ fields: Record<string, string>; message?: string }>({ fields: {} });

  const submit = async () => {
    setBusy(true);
    setErrors({ fields: {} });
    try {
      const res = await api.post<AuthResponse>("/auth/login", { email: email.trim(), password });
      await signedIn(res);
      haptic.success();
      toast(`Welcome back, ${res.user.name.split(" ")[0]}`, { tone: "success" });
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
          <H size="xxl">Welcome back</H>
          <T tone="muted">Sign in to check out, track orders and keep your favourites.</T>
        </View>
        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" error={errors.fields.email} />
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" textContentType="password" error={errors.fields.password} onSubmitEditing={submit} returnKeyType="go" />
        <FormError message={errors.message} />
        <Button title="Sign in" size="lg" loading={busy} onPress={submit} />
        <Button title="Use a one-time code instead" variant="secondary" onPress={() => router.replace({ pathname: "/otp", params: next ? { next } : {} })} />
        <T tone="muted" style={{ textAlign: "center", marginTop: 8 }}>
          New to caketown?{" "}
          <T tone="accent" weight="semi" onPress={() => router.replace({ pathname: "/signup", params: next ? { next } : {} })} accessibilityRole="link">
            Create an account
          </T>
        </T>
      </Screen>
    </KeyboardAvoidingView>
  );
}
