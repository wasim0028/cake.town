import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import type { AuthResponse } from "@caketown/shared";
import { Screen } from "@/components/Screen";
import { Button, Field, FormError, H, T } from "@/components/ui";
import { api, errorsFrom } from "@/lib/api";
import { afterAuth, signedIn } from "@/lib/auth";
import { haptic } from "@/lib/haptics";
import { toast } from "@/lib/stores";

/** Sign in with a 6-digit SMS code (for accounts that already have this mobile number). */
export default function Otp() {
  const router = useRouter();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [wait, setWait] = useState(0);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<{ fields: Record<string, string>; message?: string }>({ fields: {} });

  useEffect(() => {
    if (!wait) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const send = async () => {
    setBusy(true);
    setErrors({ fields: {} });
    try {
      const res = await api.post<{ message: string; devCode?: string }>("/auth/otp/request", { phone });
      setSent(true);
      setWait(30);
      if (res.devCode) toast("Development code", { body: `SMS is off, so here it is: ${res.devCode}` });
    } catch (e) {
      setErrors(errorsFrom(e));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    setErrors({ fields: {} });
    try {
      const res = await api.post<AuthResponse>("/auth/otp/verify", { phone, code });
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
          <H size="xxl">{sent ? "Enter the code" : "Sign in with your number"}</H>
          <T tone="muted">{sent ? `We sent a 6-digit code to ${phone}.` : "We'll text you a one-time code. Your number must already be on a caketown account."}</T>
        </View>
        {!sent ? (
          <>
            <Field label="Mobile number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" placeholder="98765 43210" error={errors.fields.phone} />
            <FormError message={errors.message} />
            <Button title="Send code" size="lg" loading={busy} onPress={send} />
          </>
        ) : (
          <>
            <Field
              label="6-digit code"
              value={code}
              onChangeText={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
              keyboardType="number-pad"
              autoComplete="sms-otp"
              textContentType="oneTimeCode"
              maxLength={6}
              style={{ fontSize: 24, letterSpacing: 8, textAlign: "center" }}
              error={errors.fields.code}
            />
            <FormError message={errors.message} />
            <Button title="Sign in" size="lg" loading={busy} disabled={code.length !== 6} onPress={verify} />
            <Button title={wait ? `Send again in ${wait}s` : "Send the code again"} variant="ghost" disabled={wait > 0} onPress={send} />
          </>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}
