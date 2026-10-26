import { useColorScheme } from "react-native";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

/** Same palette as the website (see client/src/styles/tokens.css). */
const light = {
  bg: "#F7F1E7",
  surface: "#FFFDF8",
  plate: "#EFE5D3",
  plateRim: "#E4D6BE",
  text: "#1F1611",
  muted: "#6F6158",
  line: "#E2D6C3",
  lineStrong: "#CBB99E",
  accent: "#C8893B",
  accentText: "#A86A22",
  link: "#8A4B1F",
  inverseBg: "#1F1611",
  inverseText: "#F3EADC",
  inverseMuted: "#B3A495",
  fresh: "#4E6840",
  freshBg: "#DFE7D3",
  danger: "#B2443A",
  overlay: "rgba(31,22,17,0.45)",
  shadow: "#1F1611",
};

const dark: typeof light = {
  bg: "#17110D",
  surface: "#231A14",
  plate: "#2C211A",
  plateRim: "#3A2C22",
  text: "#F3EADC",
  muted: "#B3A495",
  line: "#3A2C22",
  lineStrong: "#54412F",
  accent: "#D9A15B",
  accentText: "#D9A15B",
  link: "#E0B072",
  inverseBg: "#0F0B08",
  inverseText: "#F3EADC",
  inverseMuted: "#A8988A",
  fresh: "#A9C196",
  freshBg: "#2A3324",
  danger: "#E0786E",
  overlay: "rgba(0,0,0,0.6)",
  shadow: "#000000",
};

export type Colors = typeof light;

export const fonts = {
  display: "Fraunces_600SemiBold",
  displayMedium: "Fraunces_500Medium",
  body: "DMSans_400Regular",
  bodyMedium: "DMSans_500Medium",
  bodySemi: "DMSans_600SemiBold",
  bodyBold: "DMSans_700Bold",
};

/** Major-third scale on a 16px base. */
export const type = { xs: 12.5, sm: 14, md: 16, lg: 20, xl: 25, xxl: 31, hero: 40 };
export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48, 8: 64 } as const;
export const radius = { sm: 8, md: 14, lg: 24, pill: 999 };

export type ThemePref = "system" | "light" | "dark";

export const useThemePref = create<{ pref: ThemePref; setPref: (p: ThemePref) => void }>()(
  persist((set) => ({ pref: "system", setPref: (pref) => set({ pref }) }), {
    name: "ct-theme",
    storage: createJSONStorage(() => AsyncStorage),
  }),
);

export function useTheme() {
  const system = useColorScheme();
  const pref = useThemePref((s) => s.pref);
  const scheme = pref === "system" ? (system === "dark" ? "dark" : "light") : pref;
  return { c: scheme === "dark" ? dark : light, scheme } as const;
}

export const palette = { light, dark };
