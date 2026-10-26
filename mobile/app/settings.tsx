import * as Linking from "expo-linking";
import Constants from "expo-constants";
import { Bell, FileText, Mail, Moon, Shield } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { Row, Screen } from "@/components/Screen";
import { Card, Chip, H, Press, T } from "@/components/ui";
import { registerForPush } from "@/lib/push";
import { toast, useAuth } from "@/lib/stores";
import { radius, useTheme, useThemePref, type ThemePref } from "@/lib/theme";

const WEB = process.env.EXPO_PUBLIC_WEB_URL ?? "https://caketown.in";

function Link({ icon, label, url }: { icon: React.ReactNode; label: string; url: string }) {
  const { c } = useTheme();
  return (
    <Press onPress={() => Linking.openURL(url)} accessibilityRole="link" accessibilityLabel={label} style={{ flexDirection: "row", gap: 14, alignItems: "center", padding: 14, borderRadius: radius.md, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line }}>
      {icon}
      <T weight="semi">{label}</T>
    </Press>
  );
}

export default function Settings() {
  const { c } = useTheme();
  const { pref, setPref } = useThemePref();
  const user = useAuth((s) => s.user);
  const [pushState, setPushState] = useState<string>();

  return (
    <Screen header={false}>
      <Card>
        <Row>
          <Moon size={20} color={c.text} />
          <H size="lg">Appearance</H>
        </Row>
        <Row style={{ flexWrap: "wrap" }}>
          {(["system", "light", "dark"] as ThemePref[]).map((p) => (
            <Chip key={p} label={{ system: "Match phone", light: "Light", dark: "Dark" }[p]} selected={pref === p} onPress={() => setPref(p)} />
          ))}
        </Row>
      </Card>

      <Card>
        <Row>
          <Bell size={20} color={c.text} />
          <H size="lg">Order notifications</H>
        </Row>
        <T tone="muted">Get a notification when your order is baking, on its way and delivered.</T>
        <Chip
          label={pushState ?? "Turn on notifications"}
          disabled={!user}
          onPress={async () => {
            const r = await registerForPush();
            const msg = { ok: "Notifications are on", denied: "Allow notifications in your phone's settings", unavailable: "Available in the installed app" }[r];
            setPushState(msg);
            toast(msg, { tone: r === "ok" ? "success" : "default" });
          }}
        />
        {!user && <T size="sm" tone="muted">Sign in first.</T>}
      </Card>

      <View style={{ gap: 10 }}>
        <Link icon={<Mail size={20} color={c.text} />} label="Contact us" url="mailto:hello@caketown.in" />
        <Link icon={<Shield size={20} color={c.text} />} label="Privacy policy" url={`${WEB}/privacy`} />
        <Link icon={<FileText size={20} color={c.text} />} label="Terms of service" url={`${WEB}/terms`} />
      </View>
      <T size="xs" tone="muted" style={{ textAlign: "center" }}>
        caketown {Constants.expoConfig?.version ?? ""}
      </T>
    </Screen>
  );
}
