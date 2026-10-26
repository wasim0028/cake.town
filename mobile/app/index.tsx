import { Redirect } from "expo-router";
import { usePrefs } from "@/lib/stores";

/** First launch shows the three onboarding slides; after that, straight to the shop. */
export default function Index() {
  const onboarded = usePrefs((s) => s.onboarded);
  return <Redirect href={onboarded ? "/(tabs)" : "/onboarding"} />;
}
