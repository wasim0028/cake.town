import { useRouter } from "expo-router";
import { View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { formatINR } from "@caketown/shared";
import { Row, Screen } from "@/components/Screen";
import { Card, Empty, H, Press, Skeleton, T, Tag } from "@/components/ui";
import { useClasses } from "@/lib/queries";
import { useTheme } from "@/lib/theme";

const fmt = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

export default function ClassesTab() {
  const router = useRouter();
  const { c } = useTheme();
  const q = useClasses();
  return (
    <Screen tabs refreshing={q.isRefetching} onRefresh={() => void q.refetch()}>
      <View style={{ gap: 6 }}>
        <H size="xxl">Bake it with us</H>
        <T tone="muted">Weekend classes for up to twelve people in our kitchen. Everything you make goes home with you.</T>
      </View>
      {q.isPending ? (
        <>
          <Skeleton height={150} />
          <Skeleton height={150} />
        </>
      ) : !q.data?.length ? (
        <Empty title="No dates right now" body="New classes are added every month." />
      ) : (
        q.data.map((k, i) => {
          const next = k.sessions[0];
          const seats = k.sessions.reduce((n, s) => n + s.seatsLeft, 0);
          return (
            <Animated.View key={k.id} entering={FadeInDown.delay(i * 70).springify().damping(18)}>
              <Press onPress={() => router.push({ pathname: "/class/[slug]", params: { slug: k.slug } })} accessibilityRole="button" accessibilityLabel={k.title} scaleTo={0.98}>
                <Card>
                  <Tag label={k.level[0]!.toUpperCase() + k.level.slice(1)} tone={k.level === "beginner" ? "fresh" : k.level === "advanced" ? "neutral" : "accent"} />
                  <H size="lg">{k.title}</H>
                  <T tone="muted" numberOfLines={2}>
                    {k.description}
                  </T>
                  <Row style={{ justifyContent: "space-between", borderTopWidth: 1, borderTopColor: c.line, paddingTop: 10 }}>
                    <View>
                      <T size="xs" tone="muted">Next date</T>
                      <T size="sm" weight="semi">{next ? fmt.format(new Date(next.startsAt)) : "To be announced"}</T>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <T weight="bold">{formatINR(k.price)}</T>
                      <T size="xs" tone={seats <= 5 ? "accent" : "muted"} weight={seats <= 5 ? "semi" : "regular"}>
                        {seats ? `${seats} seats left` : "Fully booked"}
                      </T>
                    </View>
                  </Row>
                </Card>
              </Press>
            </Animated.View>
          );
        })
      )}
    </Screen>
  );
}
